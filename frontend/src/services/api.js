import axios from 'axios';

const API_BASE_URL = process.env.FLASK_APP_URL || 'http://127.0.0.1:5000';

export const getDashboardData = async (timeRange, projects, assignees) => {
  const params = new URLSearchParams({
    time_range: timeRange,
    projects: projects,
    assignees: assignees
  });

  const response = await fetch(`${API_BASE_URL}/api/dashboard?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard data');
  }
  
  const data = await response.json();
  
  // Add debug logging
  console.log('API Response:', {
    hasLifecycleTrends: !!data.lifecycle_trends,
    trendsSample: data.lifecycle_trends,
    ticketsCount: data.tickets?.length
  });

  return {
    engineers_data: data.engineers_data,
    daily_metrics: data.daily_metrics,
    lifecycle_trends: data.lifecycle_trends,
    tickets: data.tickets,
    performance_metrics: data.performance_metrics
  };
};

export const searchAssignees = async (searchTerm = '', projects = '') => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/assignees`, {
      params: {
        search: searchTerm,
        projects: projects
      }
    });
    return response.data.assignees;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const createTicket = async (ticketData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/tickets`, ticketData, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const createBulkTickets = async (tickets) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/tickets/bulk`, { tickets }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const logWorkHours = async (ticketKey, hours, comment, date = null) => {
  const response = await fetch('/api/log-work', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ticketKey,
      hours,
      comment,
      date
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to log work');
  }
  
  return response.json();
};

export const getWorkLogs = async (options = {}) => {
  const {
    ticketKeys = [],
    assignee = null,
    startDate = null,
    endDate = null
  } = options;
  
  const params = new URLSearchParams();
  
  if (ticketKeys.length > 0) {
    params.append('ticket_keys', ticketKeys.join(','));
  }
  
  if (assignee) {
    params.append('assignee', assignee);
  }
  
  if (startDate) {
    params.append('start_date', startDate);
  }
  
  if (endDate) {
    params.append('end_date', endDate);
  }

  const response = await fetch(`${API_BASE_URL}/api/work-logs?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch work logs');
  }
  
  return response.json();
};

export const getProjectDistribution = async (assignee, projects) => {
  const params = new URLSearchParams({
    ...(assignee && { assignee }),
    projects: projects.join(',')
  });
  
  const response = await fetch(`${API_BASE_URL}/api/projects/distribution?${params}`);
  return handleResponse(response);
}; 