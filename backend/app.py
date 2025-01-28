from flask import Flask, jsonify, request, redirect
from jira import JIRA
from datetime import datetime, timedelta, timezone
import pandas as pd
from .config import *
from flasgger import Swagger, swag_from
from flask_cors import CORS

app = Flask(__name__)

# Enable CORS for all routes
CORS(app, resources={
r"/*": {
        "origins": "http://localhost:3000",  # Allow all origins in development
        "methods": ["GET", "POST", "OPTIONS"],  # Added POST
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
        
        # Calculate working days
        working_days = len(pd.bdate_range(start, today))
        
        # If start and today are the same, set working_days to 1
        if working_days == 0 and start.date() == today.date():
            working_days = 1
        
        total_available_hours = working_days * 8
        idle_time = total_available_hours - float(logged_time or 0)
        
        # Ensure idle time is not negative
        return max(idle_time, 0)
    except (ValueError, TypeError):
        return 0

def calculate_time_variance(logged_time, estimated_time):
    if not estimated_time:
        return 0
    # Calculate variance as percentage difference from estimate
    # Positive: Ahead of schedule (completed early)
    # Negative: Behind schedule (took longer)
    variance = ((estimated_time - logged_time) / estimated_time) * 100
    return round(variance, 2)

def calculate_ticket_durations(changelog, created_date):
    """Calculate time spent in each status"""
    durations = {
        'time_to_start': 0,    # Created -> In Progress
        'time_to_complete': 0  # In Progress -> Done
    }
    
    try:
        # Parse created date from string to datetime
        created_date = datetime.strptime(created_date, '%Y-%m-%dT%H:%M:%S.%f%z')
        
        status_changes = []
        for history in changelog.histories:
            for item in history.items:
                if item.field == 'status':
                    status_changes.append({
                        'date': datetime.strptime(history.created, '%Y-%m-%dT%H:%M:%S.%f%z'),
                        'from_status': item.fromString,
                        'to_status': item.toString
                    })
        
        # Sort changes by date
        status_changes.sort(key=lambda x: x['date'])
        
        started_date = None
        completed_date = None
        
        for change in status_changes:
            if change['to_status'] == 'In Progress':
                started_date = change['date']
            elif change['to_status'] in ['Done', 'Closed']:
                completed_date = change['date']
        
        # Calculate durations in hours
        if started_date:
            durations['time_to_start'] = (started_date - created_date).total_seconds() / 3600
        if completed_date and started_date:
            durations['time_to_complete'] = (completed_date - started_date).total_seconds() / 3600
            
    except (ValueError, TypeError, AttributeError):
        pass  # Return default durations if any error occurs
        
    return durations

def get_daily_metrics(issues, start_date, end_date):
    """Calculate daily metrics for team performance"""
    date_range = pd.date_range(start=start_date, end=end_date, freq='D')
    
    # Initialize metrics structure with both team and per-engineer data
    daily_metrics = {str(date.date()): {
        'logged_time': 0,
        'estimated_time': 0,
        'cycle_time': 0,
        'completed_tasks': 0,
        'active_tasks': 0,
        'efficiency': 0,
        'engineers': {}  # Track per-engineer metrics
    } for date in date_range}

    # Track all engineers we encounter
    all_engineers = set()

    for issue in issues:
        assignee = issue.fields.assignee.displayName if issue.fields.assignee else 'Unassigned'
        all_engineers.add(assignee)

        # Get estimated time
        try:
            original_estimate = issue.fields.timeoriginalestimate
            if original_estimate:
                original_estimate = original_estimate / 3600  # Convert to hours
            else:
                original_estimate = 0
        except AttributeError:
            original_estimate = 0

        # Handle worklogs for actual time logged
        try:
            worklogs = issue.fields.worklog.worklogs
            if worklogs:
                for worklog in worklogs:
                    work_date = datetime.strptime(worklog.started, '%Y-%m-%dT%H:%M:%S.%f%z').date()
                    work_date_str = str(work_date)
                    if work_date_str in daily_metrics:
                        time_spent = worklog.timeSpentSeconds / 3600 if worklog.timeSpentSeconds else 0
                        
                        # Update team metrics
                        daily_metrics[work_date_str]['logged_time'] += time_spent
                        if original_estimate > 0 and len(worklogs) > 0:
                            daily_metrics[work_date_str]['estimated_time'] += original_estimate / len(worklogs)
                        
                        # Initialize engineer metrics if needed
                        if assignee not in daily_metrics[work_date_str]['engineers']:
                            daily_metrics[work_date_str]['engineers'][assignee] = {
                                'logged_time': 0,
                                'estimated_time': 0,
                                'cycle_time': 0,
                                'completed_tasks': 0,
                                'active_tasks': 0,
                                'efficiency': 0
                            }
                        
                        # Update engineer metrics
                        eng_metrics = daily_metrics[work_date_str]['engineers'][assignee]
                        eng_metrics['logged_time'] += time_spent
                        if original_estimate > 0 and len(worklogs) > 0:
                            eng_metrics['estimated_time'] += original_estimate / len(worklogs)
        except (AttributeError, ValueError):
            continue

        # Calculate cycle time (In Progress to Done)
        try:
            if issue.fields.status.name in ['Done', 'Closed'] and issue.fields.resolutiondate:
                status_changes = []
                for history in issue.changelog.histories:
                    for item in history.items:
                        if item.field == 'status':
                            status_changes.append({
                                'date': datetime.strptime(history.created, '%Y-%m-%dT%H:%M:%S.%f%z'),
                                'from_status': item.fromString,
                                'to_status': item.toString
                            })

                # Find In Progress and Done dates
                start_date = None
                end_date = None
                for change in sorted(status_changes, key=lambda x: x['date']):
                    if change['to_status'] == 'In Progress' and not start_date:
                        start_date = change['date']
                    elif change['to_status'] in ['Done', 'Closed']:
                        end_date = change['date']

                if start_date and end_date:
                    cycle_time = (end_date - start_date).total_seconds() / 3600
                    resolution_date_str = str(end_date.date())
                    if resolution_date_str in daily_metrics:
                        # Update team metrics
                        daily_metrics[resolution_date_str]['cycle_time'] += cycle_time
                        daily_metrics[resolution_date_str]['completed_tasks'] += 1
                        
                        # Update engineer metrics
                        if assignee in daily_metrics[resolution_date_str]['engineers']:
                            eng_metrics = daily_metrics[resolution_date_str]['engineers'][assignee]
                            eng_metrics['cycle_time'] += cycle_time
                            eng_metrics['completed_tasks'] += 1

        except (AttributeError, ValueError):
            continue

        # Track active tasks
        if issue.fields.status.name not in ['Done', 'Closed']:
            for date_str in daily_metrics:
                # Update team metrics
                daily_metrics[date_str]['active_tasks'] += 1
                
                # Update engineer metrics
                if assignee in daily_metrics[date_str]['engineers']:
                    daily_metrics[date_str]['engineers'][assignee]['active_tasks'] += 1

    # Calculate efficiency for team and individual engineers
    for date_metrics in daily_metrics.values():
        # Calculate team efficiency
        date_metrics['efficiency'] = calculate_efficiency(date_metrics)
        
        # Calculate efficiency for each engineer
        for eng_metrics in date_metrics['engineers'].values():
            eng_metrics['efficiency'] = calculate_efficiency(eng_metrics)

    # Prepare the response structure
    response = {
        'team': {date: {k: v for k, v in metrics.items() if k != 'engineers'}
                for date, metrics in daily_metrics.items()},
        'engineers': {engineer: {} for engineer in all_engineers}
    }

    # Populate engineer-specific metrics
    for date, metrics in daily_metrics.items():
        for engineer in all_engineers:
            eng_metrics = metrics['engineers'].get(engineer, {
                'logged_time': 0,
                'estimated_time': 0,
                'cycle_time': 0,
                'completed_tasks': 0,
                'active_tasks': 0,
                'efficiency': 0
            })
            response['engineers'][engineer][date] = eng_metrics

    return response

def calculate_efficiency(metrics):
    """Helper function to calculate efficiency metrics"""
    try:
        if metrics['logged_time'] > 0 and metrics['completed_tasks'] > 0:
            # Time accuracy calculation
            time_accuracy = 0
            if metrics['logged_time'] > 0 and metrics['estimated_time'] > 0:
                time_accuracy = min(
                    metrics['estimated_time'] / metrics['logged_time'],
                    1
                ) * 100

            # Process efficiency calculation
            process_efficiency = 0
            if metrics['cycle_time'] > 0 and metrics['logged_time'] > 0:
                process_efficiency = min(
                    metrics['logged_time'] / metrics['cycle_time'],
                    1
                ) * 100

            # Calculate overall efficiency
            if time_accuracy > 0 or process_efficiency > 0:
                return (time_accuracy + process_efficiency) / 2
    except (ZeroDivisionError, TypeError):
        pass
    return 0

def get_lifecycle_trends(issues, start_date, end_date):
    """Calculate daily lifecycle trends based on work logs"""
    date_range = pd.date_range(start=start_date, end=end_date, freq='D')
    
    # Initialize trends structure
    trends = {str(date.date()): {
        'completion_hours': 0,
        'available_hours': 8,
        'active_tasks': 0,
        'projects': {},
        'variance': 0,
        'work_logs': []  # Add work logs array to track daily work
    } for date in date_range}

    for issue in issues:
        try:
            project_key = issue.fields.project.key
            assignee = issue.fields.assignee.displayName if issue.fields.assignee else None

            # Process work logs from comments
            for comment in issue.fields.comment.comments:
                if any(marker in comment.body.lower() for marker in ['[work:', '[progress:', '[done:']):
                    work_hours = extract_hours_from_comment(comment.body)
                    comment_date = datetime.strptime(comment.created, '%Y-%m-%dT%H:%M:%S.%f%z')
                    date_str = str(comment_date.date())
                    
                    if date_str in trends:
                        # Add work log entry with more details
                        work_log = {
                            'ticket_key': issue.key,
                            'summary': issue.fields.summary,
                            'hours': work_hours,
                            'comment': comment.body,
                            'author': comment.author.displayName,
                            'project': project_key,
                            'status': issue.fields.status.name,
                            'created': comment.created
                        }
                        trends[date_str]['work_logs'].append(work_log)
                        
                        # Update completion hours
                        trends[date_str]['completion_hours'] += work_hours
                        
                        # Update project-specific data
                        if project_key not in trends[date_str]['projects']:
                            trends[date_str]['projects'][project_key] = {
                                'completion_hours': 0,
                                'active_tasks': 0
                            }
                        trends[date_str]['projects'][project_key]['completion_hours'] += work_hours

            # Track active tasks
            created_date = datetime.strptime(issue.fields.created, '%Y-%m-%dT%H:%M:%S.%f%z').date()
            resolved_date = None
            if issue.fields.resolutiondate:
                resolved_date = datetime.strptime(issue.fields.resolutiondate, '%Y-%m-%dT%H:%M:%S.%f%z').date()

            for date_str in trends:
                date = datetime.strptime(date_str, '%Y-%m-%d').date()
                if created_date <= date and (not resolved_date or date <= resolved_date):
                    trends[date_str]['active_tasks'] += 1
                    if project_key in trends[date_str]['projects']:
                        trends[date_str]['projects'][project_key]['active_tasks'] += 1

        except Exception as e:
            print(f"Error processing issue {issue.key}: {str(e)}")
            continue

    return {
        'daily_trends': trends,
        'projects': sorted(list(set(p for d in trends.values() for p in d['projects'].keys())))
    }

@app.route('/api/assignees', methods=['GET'])
@swag_from({
    'tags': ['Assignees'],
    'summary': 'Search for assignees by name and project',
    'parameters': [
        {
            'name': 'search',
            'in': 'query',
            'type': 'string',
            'required': False,
            'description': 'Search term for assignee name'
        },
        {
            'name': 'projects',
            'in': 'query',
            'type': 'string',
            'required': False,
            'description': 'Comma-separated list of project keys to filter assignees'
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
                                'emailAddress': {'type': 'string'},
                                'active': {'type': 'boolean'}
                            }
                        }
                    }
                }
            }
        },
        400: {
            'description': 'Bad Request'
        }
    }
})
def search_assignees():
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
                'emailAddress': getattr(a, 'emailAddress', ''),
                'active': True
            }
            for a in assignees
            if not search_term or search_term.lower() in a.displayName.lower()
        ]
        
        # Sort by display name
        assignee_list.sort(key=lambda x: x['displayName'])
        
        return jsonify({'assignees': assignee_list})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/tickets', methods=['POST'])
@swag_from({
    'tags': ['Tickets'],
    'summary': 'Create a new JIRA ticket',
    'parameters': [
        {
            'name': 'body',
            'in': 'body',
            'required': True,
            'schema': {
                'type': 'object',
                'required': ['project', 'issuetype', 'summary', 'description'],
                'properties': {
                    'project': {
                        'type': 'string',
                        'description': 'Project key (e.g., THC, TEC)'
                    },
                    'issuetype': {
                        'type': 'string',
                        'description': 'Issue type (e.g., Task, Bug, Story)'
                    },
                    'summary': {
                        'type': 'string',
                        'description': 'Ticket summary/title'
                    },
                    'description': {
                        'type': 'string',
                        'description': 'Detailed description'
                    },
                    'assignee': {
                        'type': 'string',
                        'description': 'Assignee account ID'
                    },
                    'status': {
                        'type': 'string',
                        'description': 'Initial status (if different from default)'
                    }
                }
            }
        }
    ],
    'responses': {
        201: {
            'description': 'Ticket created successfully',
            'schema': {
                'type': 'object',
                'properties': {
                    'key': {'type': 'string'},
                    'self': {'type': 'string'},
                    'message': {'type': 'string'}
                }
            }
        },
        400: {
            'description': 'Invalid request parameters'
        },
        500: {
            'description': 'Internal server error'
        }
    }
})
def create_ticket():
    try:
        jira = connect_jira()
        data = request.get_json()

        # Validate required fields
        required_fields = ['project', 'issuetype', 'summary', 'description']
        if not all(field in data for field in required_fields):
            return jsonify({
                'error': 'Missing required fields',
                'required': required_fields
            }), 400

        # Prepare issue fields
        issue_dict = {
            'project': {'key': data['project']},
            'summary': data['summary'],
            'description': data['description'],
            'issuetype': {'name': data['issuetype']},
        }

        # Add optional assignee if provided
        if 'assignee' in data:
            issue_dict['assignee'] = {'id': data['assignee']}

        # Create the issue
        new_issue = jira.create_issue(fields=issue_dict)

        # Update status if provided and different from default
        if 'status' in data:
            transitions = jira.transitions(new_issue)
            for t in transitions:
                if t['name'].lower() == data['status'].lower():
                    jira.transition_issue(new_issue, t['id'])
                    break

        return jsonify({
            'key': new_issue.key,
            'self': new_issue.self,
            'message': 'Ticket created successfully'
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/tickets/bulk', methods=['POST'])
@swag_from({
    'tags': ['Tickets'],
    'summary': 'Create multiple JIRA tickets in bulk',
    'parameters': [
        {
            'name': 'body',
            'in': 'body',
            'required': True,
            'schema': {
                'type': 'object',
                'required': ['tickets'],
                'properties': {
                    'tickets': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'required': ['project', 'issuetype', 'summary', 'description'],
                            'properties': {
                                'project': {
                                    'type': 'string',
                                    'description': 'Project key (e.g., THC, TEC)'
                                },
                                'issuetype': {
                                    'type': 'string',
                                    'description': 'Issue type (e.g., Task, Bug, Story)'
                                },
                                'summary': {
                                    'type': 'string',
                                    'description': 'Ticket summary/title'
                                },
                                'description': {
                                    'type': 'string',
                                    'description': 'Detailed description'
                                },
                                'assignee': {
                                    'type': 'string',
                                    'description': 'Assignee account ID'
                                },
                                'status': {
                                    'type': 'string',
                                    'description': 'Initial status (if different from default)'
                                }
                            }
                        }
                    }
                }
            }
        }
    ],
    'responses': {
        201: {
            'description': 'Tickets created successfully',
            'schema': {
                'type': 'object',
                'properties': {
                    'success': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'key': {'type': 'string'},
                                'self': {'type': 'string'}
                            }
                        }
                    },
                    'failed': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'ticket': {'type': 'object'},
                                'error': {'type': 'string'}
                            }
                        }
                    },
                    'message': {'type': 'string'}
                }
            }
        },
        400: {
            'description': 'Invalid request parameters'
        },
        500: {
            'description': 'Internal server error'
        }
    }
})
def create_bulk_tickets():
    try:
        jira = connect_jira()
        data = request.get_json()

        if 'tickets' not in data or not isinstance(data['tickets'], list):
            return jsonify({
                'error': 'Request must include a "tickets" array'
            }), 400

        required_fields = ['project', 'issuetype', 'summary', 'description']
        success_tickets = []
        failed_tickets = []

        for ticket in data['tickets']:
            try:
                # Validate required fields
                if not all(field in ticket for field in required_fields):
                    raise ValueError(f"Missing required fields: {[f for f in required_fields if f not in ticket]}")

                # Prepare issue fields
                issue_dict = {
                    'project': {'key': ticket['project']},
                    'summary': ticket['summary'],
                    'description': ticket['description'],
                    'issuetype': {'name': ticket['issuetype']},
                }

                # Add optional assignee if provided
                if 'assignee' in ticket:
                    issue_dict['assignee'] = {'id': ticket['assignee']}

                # Create the issue
                new_issue = jira.create_issue(fields=issue_dict)

                # Update status if provided and different from default
                if 'status' in ticket:
                    transitions = jira.transitions(new_issue)
                    for t in transitions:
                        if t['name'].lower() == ticket['status'].lower():
                            jira.transition_issue(new_issue, t['id'])
                            break

                success_tickets.append({
                    'key': new_issue.key,
                    'self': new_issue.self
                })

            except Exception as e:
                failed_tickets.append({
                    'ticket': ticket,
                    'error': str(e)
                })

        return jsonify({
            'success': success_tickets,
            'failed': failed_tickets,
            'message': f'Successfully created {len(success_tickets)} tickets, {len(failed_tickets)} failed'
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_ticket_data(issue):
    """Extract ticket data including work logs from comments"""
    try:
        # Calculate lifecycle times
        durations = calculate_ticket_durations(issue.changelog, issue.fields.created)
        
        ticket = {
            'key': issue.key,
            'summary': issue.fields.summary,
            'status': issue.fields.status.name,
            'assignee': issue.fields.assignee.displayName if issue.fields.assignee else None,
            'created': issue.fields.created,
            'updated': issue.fields.updated,
            'estimate': 0,  # Initialize with 0
            'logged': 0     # Initialize with 0
        }

        # Safely get estimate
        try:
            if hasattr(issue.fields, 'timeoriginalestimate') and issue.fields.timeoriginalestimate:
                ticket['estimate'] = issue.fields.timeoriginalestimate / 3600
        except (AttributeError, TypeError):
            pass

        # Safely get logged time
        try:
            if hasattr(issue.fields, 'worklog') and issue.fields.worklog:
                ticket['logged'] = sum(
                    (wl.timeSpentSeconds or 0) 
                    for wl in issue.fields.worklog.worklogs
                ) / 3600
        except (AttributeError, TypeError):
            pass

        # Get status changes for changelog
        for history in issue.changelog.histories:
            for item in history.items:
                if item.field == 'status':
                    ticket['changelog'].append({
                        'field': item.field,
                        'fromString': item.fromString,
                        'toString': item.toString,
                        'created': history.created
                    })

        # Extract work logs from comments
        if hasattr(issue.fields, 'comment') and issue.fields.comment:
            for comment in issue.fields.comment.comments:
                # Look for work log patterns
                if '[work:' in comment.body.lower():
                    hours = extract_hours_from_comment(comment.body)
                    if hours > 0:
                        comment_date = datetime.strptime(comment.created, '%Y-%m-%dT%H:%M:%S.%f%z')
                        work_log = {
                            'ticket_key': issue.key,
                            'summary': issue.fields.summary,
                            'hours': hours,
                            'comment': comment.body,
                            'date': comment_date.isoformat(),
                            'author': comment.author.displayName,
                            'project': issue.fields.project.key,
                            'status': issue.fields.status.name
                        }
                        ticket['work_logs'].append(work_log)

        return ticket
    except Exception as e:
        return {
            'key': issue.key,
            'summary': issue.fields.summary if hasattr(issue.fields, 'summary') else 'No Summary',
            'status': issue.fields.status.name if hasattr(issue.fields, 'status') else 'Unknown',
            'assignee': None,
            'created': issue.fields.created if hasattr(issue.fields, 'created') else None,
            'updated': issue.fields.updated if hasattr(issue.fields, 'updated') else None,
            'estimate': 0,
            'logged': 0,
            'project': issue.fields.project.key if hasattr(issue.fields, 'project') else 'Unknown',
            'time_to_start': 0,
            'time_to_complete': 0,
            'changelog': [],
            'work_logs': []
        }

def calculate_working_hours(total_seconds):
    """Calculate actual working hours excluding non-working hours"""
    WORK_START_HOUR = 9  # 9 AM
    WORK_END_HOUR = 17   # 5 PM
    SECONDS_PER_HOUR = 3600
    
    total_hours = total_seconds / SECONDS_PER_HOUR
    working_hours = 0
    
    # Cap at 8 hours per day
    days = int(total_hours / 24)
    remaining_hours = total_hours % 24
    
    # Add full working days
    working_hours += days * 8
    
    # Add remaining hours if within working hours
    if remaining_hours > 0:
        working_hours += min(remaining_hours, 8)
    
    return working_hours

def extract_hours_from_comment(comment):
    """Extract hours from work progress comment"""
    import re
    
    # Look for patterns like [work: 4h], [Work: 4 hours], [work: 4], etc.
    patterns = [
        r'\[work:\s*(\d+\.?\d*)h?\]',
        r'\[Work:\s*(\d+\.?\d*)h?\]',
        r'\[work:\s*(\d+\.?\d*)\s*hours?\]',
        r'\[Work:\s*(\d+\.?\d*)\s*hours?\]',
        r'\[progress:\s*(\d+\.?\d*)\s*hours?\]',
        r'\[Progress:\s*(\d+\.?\d*)\s*hours?\]',
        r'\[done:\s*(\d+\.?\d*)h?\]',
        r'\[Done:\s*(\d+\.?\d*)h?\]'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, comment)  # Removed .lower() to match case-sensitive patterns
        if match:
            try:
                return float(match.group(1))
            except ValueError:
                continue
    
    return 0

@app.route('/api/log-work', methods=['POST'])
@swag_from({
    'tags': ['Work Logs'],
    'summary': 'Log work hours for a specific ticket',
    'parameters': [
        {
            'name': 'body',
            'in': 'body',
            'required': True,
            'schema': {
                'type': 'object',
                'required': ['ticketKey', 'hours', 'comment'],
                'properties': {
                    'ticketKey': {
                        'type': 'string',
                        'description': 'JIRA ticket key (e.g., TP-123)'
                    },
                    'hours': {
                        'type': 'number',
                        'description': 'Number of hours worked'
                    },
                    'comment': {
                        'type': 'string',
                        'description': 'Work log comment'
                    },
                    'date': {
                        'type': 'string',
                        'format': 'date-time',
                        'description': 'Optional: Work log date (ISO format)'
                    }
                }
            }
        }
    ],
    'responses': {
        200: {
            'description': 'Success',
            'schema': {
                'type': 'object',
                'properties': {
                    'success': {'type': 'boolean'},
                    'message': {'type': 'string'},
                    'data': {
                        'type': 'object',
                        'properties': {
                            'ticket_key': {'type': 'string'},
                            'hours': {'type': 'number'},
                            'comment': {'type': 'string'},
                            'date': {'type': 'string'},
                            'work_log_id': {'type': 'string'},
                            'comment_id': {'type': 'string'}
                        }
                    }
                }
            }
        },
        400: {
            'description': 'Bad Request'
        }
    }
})
def log_work():
    """Log work hours for a specific ticket"""
    try:
        # Connect to Jira
        jira = connect_jira()
        
        # Extract data from request
        data = request.json
        ticket_key = data['ticketKey']
        hours = float(data['hours'])
        comment = data['comment']
        
        # Use current date/time if no date provided, format for Jira
        work_date = datetime.now()
        if data.get('date'):
            work_date = datetime.fromisoformat(data['date'].replace('Z', '+00:00'))
        
        # Format date for Jira worklog (yyyy-MM-dd HH:mm)
        work_date_str = work_date.strftime('%Y-%m-%d %H:%M')
        
        # Get the issue
        issue = jira.issue(ticket_key)
        
        # Format the work log comment with standard format
        work_comment = f"[work: {hours}h] {comment}"
        
        # Add the comment
        new_comment = jira.add_comment(issue, work_comment)
        
        # Add worklog with properly formatted date
        worklog = jira.add_worklog(
            issue=issue,
            timeSpentSeconds=int(hours * 3600),
            started=work_date_str,
            comment=comment
        )
        
        return jsonify({
            'success': True,
            'message': 'Work logged successfully',
            'data': {
                'ticket_key': ticket_key,
                'hours': hours,
                'comment': work_comment,
                'date': work_date_str,
                'work_log_id': worklog.id,
                'comment_id': new_comment.id
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400

@app.route('/api/work-logs', methods=['GET'])
@swag_from({
    'tags': ['Work Logs'],
    'summary': 'Get work logs filtered by assignee, tickets, and date range',
    'parameters': [
        {
            'name': 'ticket_keys',
            'in': 'query',
            'type': 'string',
            'required': False,
            'description': 'Optional: Comma-separated list of ticket keys (e.g., TP-123,TP-124)'
        },
        {
            'name': 'assignee',
            'in': 'query',
            'type': 'string',
            'required': False,
            'description': 'Optional: Filter work logs by assignee'
        },
        {
            'name': 'start_date',
            'in': 'query',
            'type': 'string',
            'format': 'date-time',
            'required': False,
            'description': 'Start date for work logs (ISO format). Defaults to 30 days ago.'
        },
        {
            'name': 'end_date',
            'in': 'query',
            'type': 'string',
            'format': 'date-time',
            'required': False,
            'description': 'End date for work logs (ISO format). Defaults to current date.'
        }
    ],
    'responses': {
        200: {
            'description': 'Success',
            'schema': {
                'type': 'object',
                'properties': {
                    'success': {'type': 'boolean'},
                    'data': {
                        'type': 'object',
                        'additionalProperties': {
                            'type': 'object',
                            'properties': {
                                'total_hours': {'type': 'number'},
                                'tickets': {'type': 'array', 'items': {'type': 'string'}},
                                'logs': {
                                    'type': 'array',
                                    'items': {
                                        'type': 'object',
                                        'properties': {
                                            'ticket_key': {'type': 'string'},
                                            'summary': {'type': 'string'},
                                            'hours': {'type': 'number'},
                                            'comment': {'type': 'string'},
                                            'date': {'type': 'string', 'format': 'date-time'},
                                            'author': {'type': 'string'},
                                            'assignee': {'type': 'string'},
                                            'status': {'type': 'string'}
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        400: {
            'description': 'Bad Request'
        }
    }
})
def get_work_logs():
    """Get work logs filtered by assignee, tickets, and date range"""
    try:
        jira = connect_jira()
        
        # Get query parameters
        ticket_keys = request.args.get('ticket_keys', '').split(',')
        assignee = request.args.get('assignee')
        
        # Set default date range (last 30 days)
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=30)
        
        # Override with provided dates if they exist
        if request.args.get('start_date'):
            start_date = datetime.fromisoformat(request.args.get('start_date').replace('Z', '+00:00'))
        if request.args.get('end_date'):
            end_date = datetime.fromisoformat(request.args.get('end_date').replace('Z', '+00:00'))
            
        # Format dates for JQL
        start_date_str = start_date.strftime('%Y-%m-%d')
        end_date_str = end_date.strftime('%Y-%m-%d')
        
        # Build JQL query
        jql_parts = []
        
        # Add ticket filter if provided
        if ticket_keys and ticket_keys[0]:
            jql_parts.append(f'key in ({",".join(ticket_keys)})')
            
        # Add assignee filter if provided
        if assignee:
            jql_parts.append(f'assignee = "{assignee}"')
            
        # Add date range
        jql_parts.append(f'updated >= "{start_date_str}"')
        jql_parts.append(f'updated <= "{end_date_str}"')
            
        jql_query = ' AND '.join(jql_parts)
        
        # Get issues with comments
        issues = jira.search_issues(jql_query, maxResults=1000, expand='changelog,comments')
        
        # Process work logs
        work_logs = []
        for issue in issues:
            if hasattr(issue.fields, 'comment') and issue.fields.comment:
                for comment in issue.fields.comment.comments:
                    comment_date = datetime.strptime(comment.created, '%Y-%m-%dT%H:%M:%S.%f%z')
                    
                    if '[work:' in comment.body.lower():
                        if assignee and comment.author.displayName != assignee:
                            continue
                            
                        hours = extract_hours_from_comment(comment.body)
                        if hours > 0:
                            work_log = {
                                'ticket_key': issue.key,
                                'summary': issue.fields.summary,
                                'hours': hours,
                                'comment': comment.body,
                                'date': comment_date.isoformat(),
                                'author': comment.author.displayName,
                                'assignee': issue.fields.assignee.displayName if issue.fields.assignee else None,
                                'status': issue.fields.status.name
                            }
                            work_logs.append(work_log)
        
        # Group work logs by date
        daily_work = {}
        for log in work_logs:
            date = log['date'].split('T')[0]
            if date not in daily_work:
                daily_work[date] = {
                    'total_hours': 0,
                    'tickets': set(),
                    'logs': []
                }
            
            daily_work[date]['total_hours'] += log['hours']
            daily_work[date]['tickets'].add(log['ticket_key'])
            daily_work[date]['logs'].append(log)
        
        # Convert sets to lists for JSON serialization
        for date in daily_work:
            daily_work[date]['tickets'] = list(daily_work[date]['tickets'])
        
        return jsonify({
            'success': True,
            'data': daily_work
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400

@app.route('/api/dashboard', methods=['GET'])
@swag_from({
    'tags': ['Dashboard'],
    'summary': 'Get dashboard data including metrics, trends and tickets',
    'parameters': [
        {
            'name': 'time_range',
            'in': 'query',
            'type': 'string',
            'required': False,
            'description': 'Time range for metrics (e.g., 7d, 1m, 3m, 6m, all). Defaults to 1m',
            'enum': ['7d', '1m', '3m', '6m', 'all']
        },
        {
            'name': 'projects',
            'in': 'query',
            'type': 'string',
            'required': False,
            'description': 'Comma-separated list of project keys (e.g., THC,TEC,TP)'
        },
        {
            'name': 'assignees',
            'in': 'query',
            'type': 'string',
            'required': False,
            'description': 'Comma-separated list of assignee names'
        }
    ],
    'responses': {
        200: {
            'description': 'Success',
            'schema': {
                'type': 'object',
                'properties': {
                    'engineers_data': {'type': 'object'},
                    'daily_metrics': {'type': 'object'},
                    'lifecycle_trends': {'type': 'object'},
                    'tickets': {'type': 'array'},
                    'performance_metrics': {'type': 'object'}
                }
            }
        },
        500: {
            'description': 'Server Error'
        }
    }
})
def get_dashboard_data():
    try:
        jira = connect_jira()
        time_range = request.args.get('time_range', '1m')
        projects = request.args.get('projects', '').split(',')
        assignees = request.args.get('assignees', '').split(',')
        
        # Calculate date range based on time_range
        end_date = datetime.now()
        start_date = end_date - {
            '7d': timedelta(days=7),
            '1m': timedelta(days=30),
            '3m': timedelta(days=90),
            '6m': timedelta(days=180),
            'all': timedelta(days=365)
        }.get(time_range, timedelta(days=30))
        
        # Build JQL query
        jql_parts = []
        
        if projects and projects[0]:
            jql_parts.append(f'project in ({",".join(projects)})')
            
        if assignees and assignees[0]:
            jql_parts.append(f'assignee in ({",".join(assignees)})')
            
        jql_parts.append(f'updated >= "{start_date.strftime("%Y-%m-%d")}"')
        jql_query = ' AND '.join(jql_parts)
        
        # Fetch issues with all required data
        issues = jira.search_issues(
            jql_query,
            maxResults=1000,
            expand='changelog,worklog'
        )
        
        # Initialize data structures
        engineers_data = {}
        tickets = []
        performance_metrics = {
            'avg_time_to_start': 0,
            'avg_time_to_complete': 0,
            'completed_tickets': 0,
            'in_progress_tickets': 0
        }
        
        # Process each issue
        for issue in issues:
            # Extract ticket data
            ticket = {
                'key': issue.key,
                'summary': issue.fields.summary,
                'status': issue.fields.status.name,
                'assignee': issue.fields.assignee.displayName if issue.fields.assignee else None,
                'created': issue.fields.created,
                'updated': issue.fields.updated,
                'estimate': 0,  # Initialize with 0
                'logged': 0     # Initialize with 0
            }
            
            # Safely get estimate
            try:
                if hasattr(issue.fields, 'timeoriginalestimate') and issue.fields.timeoriginalestimate:
                    ticket['estimate'] = issue.fields.timeoriginalestimate / 3600
            except (AttributeError, TypeError):
                pass

            # Safely get logged time
            try:
                if hasattr(issue.fields, 'worklog') and issue.fields.worklog:
                    ticket['logged'] = sum(
                        (wl.timeSpentSeconds or 0) 
                        for wl in issue.fields.worklog.worklogs
                    ) / 3600
            except (AttributeError, TypeError):
                pass

            # Calculate durations
            durations = calculate_ticket_durations(issue.changelog, issue.fields.created)
            ticket.update(durations)
            
            tickets.append(ticket)
            
            # Update engineer data
            if ticket['assignee']:
                if ticket['assignee'] not in engineers_data:
                    engineers_data[ticket['assignee']] = {
                        'total_estimate': 0,
                        'total_logged': 0,
                        'idle_time': 0,
                        'current_work': 0,
                        'projects': {},
                        'time_variance': 0,
                        'tickets': [],
                        'performance_metrics': {
                            'avg_time_to_start': 0,
                            'avg_time_to_complete': 0,
                            'completed_tickets': 0,
                            'in_progress_tickets': 0
                        }
                    }
                
                eng_data = engineers_data[ticket['assignee']]
                eng_data['total_estimate'] += ticket['estimate']
                eng_data['total_logged'] += ticket['logged']
                eng_data['tickets'].append(ticket)
                
                # Update project-specific data
                project = ticket['key'].split('-')[0]
                if project not in eng_data['projects']:
                    eng_data['projects'][project] = {
                        'total_estimate': 0,
                        'total_logged': 0,
                        'ticket_count': 0,
                        'completed_count': 0,
                        'active_count': 0,
                        'bandwidth': 0
                    }
                
                proj_data = eng_data['projects'][project]
                proj_data['total_estimate'] += ticket['estimate']
                proj_data['total_logged'] += ticket['logged']
                proj_data['ticket_count'] += 1
                
                if ticket['status'] in ['Done', 'Closed']:
                    proj_data['completed_count'] += 1
                else:
                    proj_data['active_count'] += 1
        
        # Calculate daily metrics and lifecycle trends
        daily_metrics = get_daily_metrics(issues, start_date, end_date)
        lifecycle_trends = {
            'daily_trends': daily_metrics['team'],
            'engineer_trends': daily_metrics['engineers']
        }
        
        # Calculate performance metrics
        if tickets:
            performance_metrics.update({
                'avg_time_to_start': sum(t['time_to_start'] for t in tickets) / len(tickets),
                'avg_time_to_complete': sum(t['time_to_complete'] for t in tickets) / len(tickets),
                'completed_tickets': sum(1 for t in tickets if t['status'] in ['Done', 'Closed']),
                'in_progress_tickets': sum(1 for t in tickets if t['status'] not in ['Done', 'Closed'])
            })
        
        return jsonify({
            'engineers_data': engineers_data,
            'daily_metrics': daily_metrics,
            'lifecycle_trends': lifecycle_trends,
            'tickets': tickets,
            'performance_metrics': performance_metrics
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/performance/trends', methods=['GET'])
@swag_from({
    'tags': ['Performance'],
    'summary': 'Get performance trends and resource utilization metrics',
    'parameters': [
        {
            'name': 'time_range',
            'in': 'query',
            'type': 'string',
            'required': False,
            'description': 'Time range for metrics (e.g., 7d, 1m, 3m, 6m, all). Defaults to 1m',
            'enum': ['7d', '1m', '3m', '6m', 'all']
        },
        {
            'name': 'projects',
            'in': 'query',
            'type': 'string',
            'required': False,
            'description': 'Comma-separated list of project keys'
        },
        {
            'name': 'engineer',
            'in': 'query',
            'type': 'string',
            'required': False,
            'description': 'Filter metrics for specific engineer'
        }
    ],
    'responses': {
        200: {
            'description': 'Success',
            'schema': {
                'type': 'object',
                'properties': {
                    'trends': {
                        'type': 'object',
                        'properties': {
                            'daily_metrics': {
                                'type': 'object',
                                'additionalProperties': {
                                    'type': 'object',
                                    'properties': {
                                        'total_logged': {'type': 'number'},
                                        'total_estimate': {'type': 'number'},
                                        'active_resources': {'type': 'array', 'items': {'type': 'string'}},
                                        'idle_resources': {'type': 'number'},
                                        'idle_hours': {'type': 'number'},
                                        'variance': {'type': 'number'},
                                        'variance_percentage': {'type': 'number'},
                                        'avg_hours_per_resource': {'type': 'number'}
                                    }
                                }
                            },
                            'summary': {
                                'type': 'object',
                                'properties': {
                                    'total_resources': {'type': 'number'},
                                    'total_working_days': {'type': 'number'},
                                    'total_available_hours': {'type': 'number'},
                                    'total_logged_hours': {'type': 'number'},
                                    'total_estimated_hours': {'type': 'number'},
                                    'variance': {'type': 'number'},
                                    'variance_percentage': {'type': 'number'},
                                    'resource_utilization': {'type': 'number'},
                                    'avg_daily_hours_per_resource': {'type': 'number'}
                                }
                            }
                        }
                    }
                }
            }
        },
        400: {
            'description': 'Bad Request',
            'schema': {
                'type': 'object',
                'properties': {
                    'error': {'type': 'string'}
                }
            }
        }
    }
})
def get_performance_trends():
    try:
        jira = connect_jira()
        time_range = request.args.get('time_range', '1m')
        projects = request.args.get('projects', '').split(',')
        engineer = request.args.get('engineer')

        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - {
            '7d': timedelta(days=7),
            '1m': timedelta(days=30),
            '3m': timedelta(days=90),
            '6m': timedelta(days=180),
            'all': timedelta(days=365)
        }.get(time_range, timedelta(days=30))

        # Build JQL query
        jql_parts = []
        if projects and projects[0]:
            jql_parts.append(f'project in ({",".join(projects)})')
        if engineer:
            jql_parts.append(f'assignee = "{engineer}"')
        jql_parts.append(f'updated >= "{start_date.strftime("%Y-%m-%d")}"')
        jql_query = ' AND '.join(jql_parts)

        # Fetch issues
        issues = jira.search_issues(
            jql_query,
            maxResults=1000,
            expand='changelog,worklog'
        )

        # Calculate working days in the period
        total_days = (end_date - start_date).days
        working_days = sum(1 for d in (start_date + timedelta(days=x) for x in range(total_days))
                          if d.weekday() < 5)  # Excluding weekends
        
        # Initialize data structures
        resources_data = {}
        daily_metrics = {}
        total_resources = set()
        daily_deviations = {}  # Track deviations for each day

        for issue in issues:
            assignee = issue.fields.assignee.displayName if issue.fields.assignee else "Unassigned"
            total_resources.add(assignee)
            
            # Get estimate in hours
            estimate = (issue.fields.timeoriginalestimate or 0) / 3600
            
            # Calculate logged time per day
            if hasattr(issue.fields, 'worklog') and issue.fields.worklog:
                for worklog in issue.fields.worklog.worklogs:
                    work_date = datetime.strptime(worklog.started[:10], '%Y-%m-%d')
                    if start_date <= work_date <= end_date:
                        date_str = work_date.strftime('%Y-%m-%d')
                        logged_hours = worklog.timeSpentSeconds / 3600
                        
                        # Initialize daily metrics and deviations
                        if date_str not in daily_metrics:
                            daily_metrics[date_str] = {
                                'total_logged': 0,
                                'total_estimate': 0,
                                'active_resources': set(),
                                'deviations': [],  # Store individual task deviations
                                'std_deviation': 0,
                                'mean_deviation': 0,
                                'total_resources_count': len(total_resources),  # Add total resources count
                                'resource_hours': {}  # Track hours per resource
                            }
                            daily_deviations[date_str] = []
                        
                        # Initialize resource tracking if not exists
                        if assignee not in daily_metrics[date_str]['resource_hours']:
                            daily_metrics[date_str]['resource_hours'][assignee] = {
                                'active_hours': 0,  # Hours from In Progress tasks
                                'total_hours': 8,   # Total available hours per day
                                'idle_hours': 8     # Initialize with full day as idle
                            }
                        
                        # Update active hours only if task is In Progress
                        if issue.fields.status.name == 'In Progress':
                            resource_hours = daily_metrics[date_str]['resource_hours'][assignee]
                            resource_hours['active_hours'] += logged_hours
                            resource_hours['idle_hours'] = max(0, resource_hours['total_hours'] - resource_hours['active_hours'])
                            daily_metrics[date_str]['active_resources'].add(assignee)
                        
                        daily_metrics[date_str]['total_logged'] += logged_hours
                        daily_metrics[date_str]['total_estimate'] += estimate
                        
                        # Calculate and store deviation for this task
                        if estimate > 0:  # Only consider tasks with estimates
                            deviation_percentage = ((logged_hours - estimate) / estimate) * 100
                            daily_metrics[date_str]['deviations'].append(deviation_percentage)
                        else:
                            # If no estimate, consider it a 100% deviation if there are logged hours
                            if logged_hours > 0:
                                daily_metrics[date_str]['deviations'].append(100)

        # Calculate metrics
        total_resources_count = len(total_resources)
        total_available_hours = working_days * 8 * total_resources_count
        total_logged_hours = sum(day['total_logged'] for day in daily_metrics.values())
        total_estimated_hours = sum(day['total_estimate'] for day in daily_metrics.values())
        all_deviations = []  # Store all deviations for overall statistics

        # Calculate daily averages, idle resources, and statistical measures
        for date, metrics in daily_metrics.items():
            active_count = len(metrics['active_resources'])
            
            # Calculate average active and idle hours across all resources
            total_active_hours = sum(r['active_hours'] for r in metrics['resource_hours'].values())
            total_idle_hours = sum(r['idle_hours'] for r in metrics['resource_hours'].values())
            
            metrics['avg_active_hours'] = total_active_hours / total_resources_count if total_resources_count > 0 else 0
            metrics['avg_idle_hours'] = total_idle_hours / total_resources_count if total_resources_count > 0 else 0
            metrics['idle_resources'] = total_resources_count - active_count
            metrics['avg_hours_per_resource'] = metrics['total_logged'] / total_resources_count if total_resources_count > 0 else 0
            
            # Convert set to list for JSON serialization
            metrics['active_resources'] = list(metrics['active_resources'])
            
            # Calculate statistical measures if we have deviations
            deviations = metrics['deviations']
            if deviations:
                mean_deviation = sum(deviations) / len(deviations)
                metrics['mean_deviation'] = mean_deviation
                
                squared_diff_sum = sum((x - mean_deviation) ** 2 for x in deviations)
                metrics['std_deviation'] = (squared_diff_sum / len(deviations)) ** 0.5
                
                all_deviations.extend(deviations)
            
            # Remove raw data from response
            metrics.pop('deviations', None)
            metrics.pop('resource_hours', None)  # Remove detailed resource hours from response

        # Calculate overall statistics
        overall_mean_deviation = sum(all_deviations) / len(all_deviations) if all_deviations else 0
        squared_diff_sum = sum((x - overall_mean_deviation) ** 2 for x in all_deviations) if all_deviations else 0
        overall_std_deviation = (squared_diff_sum / len(all_deviations)) ** 0.5 if all_deviations else 0

        return jsonify({
            'trends': {
                'daily_metrics': daily_metrics,
                'summary': {
                    'total_resources': total_resources_count,
                    'total_working_days': working_days,
                    'total_available_hours': total_available_hours,
                    'total_logged_hours': total_logged_hours,
                    'total_estimated_hours': total_estimated_hours,
                    'mean_deviation': overall_mean_deviation,
                    'std_deviation': overall_std_deviation,
                    'resource_utilization': (total_logged_hours / total_available_hours * 100) if total_available_hours > 0 else 0,
                    'avg_daily_hours_per_resource': total_logged_hours / (total_resources_count * working_days) if total_resources_count * working_days > 0 else 0
                }
            }
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 400


if __name__ == '__main__':
    app.run(host='localhost', port=5000, debug=True)
