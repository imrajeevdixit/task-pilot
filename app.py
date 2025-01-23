from flask import Flask, render_template, jsonify, request
from jira import JIRA
from datetime import datetime, timedelta
import pandas as pd
from config import *
from flasgger import Swagger, swag_from

app = Flask(__name__)
app.config.from_object('config')

# Swagger Config
swagger_config = {
    "headers": [],
    "specs": [
        {
            "endpoint": 'apispec',
            "route": '/apispec.json',
            "rule_filter": lambda rule: True,
            "model_filter": lambda tag: True,
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/swagger/"
}

swagger = Swagger(app, config=swagger_config)

def connect_jira():
    return JIRA(
        server=JIRA_SERVER,
        basic_auth=(JIRA_EMAIL, JIRA_API_TOKEN)
    )

def calculate_idle_time(start_date, logged_time):
    if not start_date or start_date == '{}':
        return 0
    try:
        start = datetime.strptime(start_date, '%Y-%m-%d')
        today = datetime.now()
        working_days = len(pd.bdate_range(start, today))
        total_available_hours = working_days * 8
        return total_available_hours - float(logged_time or 0)
    except (ValueError, TypeError):
        return 0

@app.route('/api/dashboard', methods=['GET'])
@swag_from({
    'tags': ['Dashboard'],
    'summary': 'Get engineering productivity metrics across multiple projects',
    'parameters': [
        {
            'name': 'time_range',
            'in': 'query',
            'type': 'string',
            'enum': ['7d', '1m', '3m', '6m', 'all'],
            'default': '3m',
            'description': 'Time range for metrics'
        },
        {
            'name': 'projects',
            'in': 'query',
            'type': 'array',
            'items': {'type': 'string'},
            'default': ['THC', 'TEC', 'TP', 'TWCP', 'TPO'],
            'description': 'Projects to include in metrics'
        }
    ],
    'responses': {
        200: {
            'description': 'Success',
            'schema': {
                'type': 'object',
                'properties': {
                    'engineers_data': {
                        'type': 'object',
                        'properties': {
                            'engineer_name': {
                                'type': 'object',
                                'properties': {
                                    'total_estimate': {'type': 'number'},
                                    'total_logged': {'type': 'number'},
                                    'idle_time': {'type': 'number'},
                                    'current_work': {'type': 'number'},
                                    'bandwidth': {'type': 'number'},
                                    'projects': {
                                        'type': 'object',
                                        'properties': {
                                            'project_key': {
                                                'type': 'object',
                                                'properties': {
                                                    'total_estimate': {'type': 'number'},
                                                    'total_logged': {'type': 'number'},
                                                    'idle_time': {'type': 'number'},
                                                    'current_work': {'type': 'number'},
                                                    'bandwidth': {'type': 'number'}
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        500: {
            'description': 'Internal Server Error'
        }
    }
})
def get_dashboard_data():
    """
    Get Engineering Productivity Dashboard Data
    This endpoint returns metrics about engineer productivity including estimates, logged time, and bandwidth
    """
    try:
        jira = connect_jira()
        time_range = request.args.get('time_range', '3m')
        # Get projects from query params, default to all projects
        projects = request.args.getlist('projects') or ['THC', 'TEC', 'TP', 'TWCP', 'TPO']
        projects_str = '", "'.join(projects)
        
        # Calculate date range
        date_clause = ''
        if time_range != 'all':
            today = datetime.now()
            if time_range == '7d':
                start_date = today - timedelta(days=7)
            elif time_range == '1m':
                start_date = today - timedelta(days=30)
            elif time_range == '3m':
                start_date = today - timedelta(days=90)
            elif time_range == '6m':
                start_date = today - timedelta(days=180)
            
            date_clause = f' AND updated >= "{start_date.strftime("%Y-%m-%d")}"'
        
        # Query with pagination
        start_at = 0
        max_results = 500
        all_issues = []
        
        while True:
            jql_query = f'project in ("{projects_str}") AND assignee is not EMPTY{date_clause} ORDER BY created DESC'
            issues = jira.search_issues(jql_query, startAt=start_at, maxResults=max_results, expand='changelog')
            
            if not issues:
                break
            
            all_issues.extend(issues)
            if len(issues) < max_results:
                break
            
            start_at += max_results

        # Process issues
        engineers_data = {}
        for issue in all_issues:
            assignee = issue.fields.assignee.displayName
            project = issue.fields.project.key  # Get project key
            
            if assignee not in engineers_data:
                engineers_data[assignee] = {
                    'total_estimate': 0,
                    'total_logged': 0,
                    'idle_time': 0,
                    'current_work': 0,
                    'projects': {}  # Track metrics per project
                }
            
            if project not in engineers_data[assignee]['projects']:
                engineers_data[assignee]['projects'][project] = {
                    'total_estimate': 0,
                    'total_logged': 0,
                    'idle_time': 0,
                    'current_work': 0
                }
            
            # Get original estimate in hours
            original_estimate = issue.fields.timeoriginalestimate
            if original_estimate:
                original_estimate = original_estimate / 3600  # Convert seconds to hours
            
            # Get logged time in hours
            time_spent = issue.fields.timespent
            if time_spent:
                time_spent = time_spent / 3600
            
            # Get start date - try different possible field names
            start_date = None
            try:
                start_date = str(issue.fields.customfield_10015 or '')  # Adjust field ID based on your JIRA
            except AttributeError:
                pass
            
            # Update both overall and project-specific metrics
            engineers_data[assignee]['total_estimate'] += original_estimate or 0
            engineers_data[assignee]['total_logged'] += time_spent or 0
            engineers_data[assignee]['idle_time'] += calculate_idle_time(start_date, time_spent)
            
            engineers_data[assignee]['projects'][project]['total_estimate'] += original_estimate or 0
            engineers_data[assignee]['projects'][project]['total_logged'] += time_spent or 0
            engineers_data[assignee]['projects'][project]['idle_time'] += calculate_idle_time(start_date, time_spent)
            
            # Calculate current work assigned (open issues)
            if issue.fields.status.name not in ['Done', 'Closed']:
                engineers_data[assignee]['current_work'] += original_estimate or 0
                engineers_data[assignee]['projects'][project]['current_work'] += original_estimate or 0
        
        # Calculate metrics
        for engineer in engineers_data:
            data = engineers_data[engineer]
            data['bandwidth'] = (data['current_work'] / (8 * 5)) * 100
            
            # Calculate per-project bandwidth
            for project in data['projects']:
                project_data = data['projects'][project]
                project_data['bandwidth'] = (project_data['current_work'] / (8 * 5)) * 100
            
        return jsonify({"engineers_data": engineers_data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/')
def dashboard():
    """Web dashboard view"""
    time_range = request.args.get('time_range', '3m')
    selected_projects = request.args.getlist('projects') or ['THC', 'TEC', 'TP', 'TWCP', 'TPO']
    engineers_data = get_dashboard_data()[0].json['engineers_data']
    return render_template('dashboard.html', 
                         engineers_data=engineers_data, 
                         current_range=time_range,
                         selected_projects=selected_projects)

if __name__ == '__main__':
    app.run(debug=True) 