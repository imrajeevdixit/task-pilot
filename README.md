# Task Pilot

Task Pilot is a comprehensive engineering productivity dashboard that provides real-time insights into team performance, project metrics, and ticket lifecycle management by integrating with JIRA.

## Features

- **Dashboard Overview**
  - Real-time performance metrics
  - Project distribution visualization
  - Team member productivity insights
  - Ticket lifecycle tracking

- **Project Metrics**
  - Active vs. completed tasks
  - Project bandwidth allocation
  - Time tracking and estimates
  - Resource utilization

- **Ticket Lifecycle**
  - Current tasks overview
  - Completed tasks history
  - Time to start/complete metrics
  - Status tracking and updates

## Tech Stack

### Frontend
- React.js
- Material-UI (MUI)
- React Query
- Axios

### Backend
- Python
- Flask
- JIRA API Integration
- Pandas for data processing

## Prerequisites

- Node.js (v14 or higher)
- Python (v3.8 or higher)
- JIRA account with API access

## Installation

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your JIRA credentials and settings
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.development.example .env.development
# Edit with your backend API URL
```

## Running the Application

### Start Backend Server

```bash
cd backend
python app.py
```
The backend server will start at http://localhost:5000

### Start Frontend Development Server

```bash
cd frontend
npm start
```
The application will be available at http://localhost:3000

## Development

### Backend Structure
```
backend/
├── app.py              # Main Flask application
├── config.py           # Configuration settings
├── requirements.txt    # Python dependencies
└── templates/         # HTML templates
```

### Frontend Structure
```
frontend/
├── public/           # Static files
├── src/
│   ├── components/  # React components
│   ├── services/    # API services
│   ├── App.js       # Main application component
│   └── index.js     # Application entry point
└── package.json     # Node.js dependencies
```

## Key Components

### Dashboard
- Main interface showing overall metrics
- Project distribution charts
- Performance trends

### MetricsCard
- Individual engineer metrics
- Project breakdown
- Time tracking statistics

### TicketLifecycleMetrics
- Ticket status tracking
- Time to completion metrics
- Project-wise ticket distribution

## API Endpoints

### Dashboard Data
```
GET /api/dashboard
Query Parameters:
- time_range: '7d', '1m', '3m', '6m', 'all'
- projects: Comma-separated project keys
- assignees: Comma-separated assignee names
```

### Performance Trends
```
GET /api/performance/trends
Query Parameters:
- time_range: Time period for metrics
- projects: Project filter
```

### Team Member Data
```
GET /api/team-member
Query Parameters:
- assignee: Team member name
- time_range: Metric period
- projects: Project filter
```

## Debugging

### Frontend
1. Use Chrome DevTools (F12)
2. React Developer Tools extension
3. Console logging enabled in development

### Backend
1. Flask debug mode enabled
2. Detailed error logging
3. API response validation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the repository or contact the development team. 