from flask import Flask, jsonify, request, redirect
from jira import JIRA
from datetime import datetime, timedelta
import pandas as pd
from .config import *
from flasgger import Swagger, swag_from
from flask_cors import CORS

app = Flask(__name__)

# Enable CORS for all routes
CORS(app, resources={
    r"/*": {
        "origins": "http://localhost:3000",  # Allow all origins in development
        "methods": ["GET", "OPTIONS"],
        "allow_headers": ["Content-Type", "Accept", "Authorization", "Origin"]
    }
})

# Basic Swagger config
app.config['SWAGGER'] = {
    'title': 'Engineering Productivity API',
    'version': '1.0.0',
    'description': 'API for JIRA productivity metrics',
    'specs_route': '/swagger/',
    'uiversion': 3
}

swagger = Swagger(app)

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
            'type': 'string',
            'default': 'THC,TEC,TP,TWCP,TPO',
            'description': 'Comma-separated list of projects to include in metrics'
        },
        {
            'name': 'assignees',
            'in': 'query',
            'type': 'string',
            'description': 'Comma-separated list of assignees to include in metrics'
        }
    ],
    'responses': {
        200: {
            'description': 'Success',
            'schema': {
                'type': 'object',
                'properties': {
                    'engineers_data': {'type': 'object'}
                }
            }
        },
        500: {
            'description': 'Internal Server Error'
        }
    }
})
def get_dashboard_data():
    try:
        jira = connect_jira()
        time_range = request.args.get('time_range', '3m')
        projects = request.args.getlist('projects')
        assignees = request.args.get('assignees', '').split(',')
        
        if not projects:
            projects = ['THC', 'TEC', 'TP', 'TWCP', 'TPO']
        elif len(projects) == 1 and ',' in projects[0]:
            projects = [p.strip() for p in projects[0].split(',')]
        
        # Format projects for JQL
        projects_str = ', '.join([f'"{p}"' for p in projects])
        
        # Add assignee filter if provided
        assignee_clause = ''
        if assignees and assignees[0]:  # Check if assignees list is not empty
            assignee_str = ', '.join([f'"{a}"' for a in assignees])
            assignee_clause = f' AND assignee in ({assignee_str})'
        
        # Calculate date range
        date_clause = ''
        if time_range != 'all':
            today = datetime.now()
            days = {'7d': 7, '1m': 30, '3m': 90, '6m': 180}
            start_date = today - timedelta(days=days[time_range])
            date_clause = f' AND updated >= "{start_date.strftime("%Y-%m-%d")}"'
        
        # Query with pagination
        start_at = 0
        max_results = 500
        all_issues = []
        
        while True:
            jql_query = f'project in ({projects_str}){assignee_clause}{date_clause} AND assignee is not EMPTY ORDER BY created DESC'
            
            issues = jira.search_issues(jql_query, startAt=start_at, maxResults=max_results, expand='changelog')
            if not issues or len(issues) < max_results:
                all_issues.extend(issues)
                break
            all_issues.extend(issues)
            start_at += max_results

        # Process issues
        engineers_data = {}
        for issue in all_issues:
            assignee = issue.fields.assignee.displayName
            project = issue.fields.project.key
            
            if assignee not in engineers_data:
                engineers_data[assignee] = {
                    'total_estimate': 0, 'total_logged': 0,
                    'idle_time': 0, 'current_work': 0, 'projects': {}
                }
            
            if project not in engineers_data[assignee]['projects']:
                engineers_data[assignee]['projects'][project] = {
                    'total_estimate': 0, 'total_logged': 0,
                    'idle_time': 0, 'current_work': 0
                }
            
            # Get time metrics
            original_estimate = (issue.fields.timeoriginalestimate or 0) / 3600
            time_spent = (issue.fields.timespent or 0) / 3600
            
            try:
                start_date = str(issue.fields.customfield_10015 or '')
            except AttributeError:
                start_date = None
            
            # Update metrics
            for scope in [engineers_data[assignee], engineers_data[assignee]['projects'][project]]:
                scope['total_estimate'] += original_estimate
                scope['total_logged'] += time_spent
                scope['idle_time'] += calculate_idle_time(start_date, time_spent)
                if issue.fields.status.name not in ['Done', 'Closed']:
                    scope['current_work'] += original_estimate
        
        # Calculate bandwidth
        for engineer_data in engineers_data.values():
            engineer_data['bandwidth'] = (engineer_data['current_work'] / (8 * 5)) * 100
            for project_data in engineer_data['projects'].values():
                project_data['bandwidth'] = (project_data['current_work'] / (8 * 5)) * 100
            
        return jsonify({"engineers_data": engineers_data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/assignees', methods=['GET'])
@swag_from({
    'tags': ['Assignees'],
    'summary': 'Get list of assignees from JIRA projects',
    'parameters': [
        {
            'name': 'search',
            'in': 'query',
            'type': 'string',
            'required': False,
            'description': 'Search term to filter assignees'
        },
        {
            'name': 'projects',
            'in': 'query',
            'type': 'string',
            'required': False,
            'description': 'Comma-separated list of project keys'
        }
    ],
    'responses': {
        200: {
            'description': 'Success',
            'schema': {
                'type': 'object',
                'properties': {
                    'assignees': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'accountId': {'type': 'string'},
                                'displayName': {'type': 'string'},
                                'emailAddress': {'type': 'string'}
                            }
                        }
                    }
                }
            }
        }
    }
})
def get_assignees():
    try:
        jira = connect_jira()
        search_term = request.args.get('search', '')
        projects = request.args.get('projects', '').split(',')
        
        # Build JQL query
        jql_parts = []
        if projects and projects[0]:
            projects_str = ', '.join([f'"{p.strip()}"' for p in projects])
            jql_parts.append(f'project in ({projects_str})')
        
        jql_query = ' AND '.join(jql_parts) if jql_parts else ''
        
        # Get unique assignees from issues
        assignees = set()
        start_at = 0
        max_results = 500
        
        while True:
            issues = jira.search_issues(
                jql_query,
                startAt=start_at,
                maxResults=max_results,
                fields='assignee'
            )
            
            if not issues:
                break
                
            for issue in issues:
                if issue.fields.assignee:
                    assignees.add(issue.fields.assignee)
                    
            if len(issues) < max_results:
                break
                
            start_at += max_results
        
        # Convert to list and filter by search term if provided
        assignee_list = [
            {
                'accountId': a.accountId,
                'displayName': a.displayName,
                'emailAddress': getattr(a, 'emailAddress', '')
            }
            for a in assignees
            if not search_term or search_term.lower() in a.displayName.lower()
        ]
        
        # Sort by display name
        assignee_list.sort(key=lambda x: x['displayName'])
        
        return jsonify({'assignees': assignee_list})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='localhost', port=5000, debug=True)
