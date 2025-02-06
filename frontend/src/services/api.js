import { Api } from '@mui/icons-material';
import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: 'http://127.0.0.1:5000',
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
);

export const getDashboardData = async (timeRange, projects, assignees, selectedEngineer, setLoader, setData) => {
  try {
    setLoader(true);
    const params = {
      time_range: timeRange,
      projects: projects,
      assignees: assignees,
      engineer_name: selectedEngineer
    };

    const data = await api.get('/api/dashboard', { params });
    setData({
      engineers_data: data.engineers_data,
      daily_metrics: data.daily_metrics,
      lifecycle_trends: data.lifecycle_trends,
      tickets: data.tickets,
      performance_metrics: data.performance_metrics
    });
  } catch (error) {
    console.error('Dashboard Data Error:', error);
  } finally {
    setLoader(false);
  }
};

export const searchAssignees = async (searchTerm = '', projects = '', setIsLoading, setAssignees) => {
  try {
    setIsLoading(true);
    const params = {
      search: searchTerm,
      projects: projects
    };
    const response = await api.get('/api/assignees', { params });
    setAssignees(response.assignees);
  } catch (error) {
    console.error('Search Assignees Error:', error);
  } finally {
    setIsLoading(false);
  }
};

export const createTicket = async (ticketData) => {
  try {
    const response = await api.post('/api/tickets', ticketData);
    return response;
  } catch (error) {
    console.error('Create Ticket Error:', error);
    throw error;
  }
};

export const createBulkTickets = async (tickets) => {
  try {
    const response = await api.post('/api/tickets/bulk', { tickets });
    return response;
  } catch (error) {
    console.error('Create Bulk Tickets Error:', error);
    throw error;
  }
};

export const logWorkHours = async (ticketKey, hours, comment, date = null) => {
  try {
    const response = await api.post('/api/log-work', {
      ticketKey,
      hours,
      comment,
      date
    });
    return response;
  } catch (error) {
    console.error('Log Work Hours Error:', error);
    throw error;
  }
};

export const getWorkLogs = async (options = {}) => {
  try {
    const {
      ticketKeys = [],
      assignee = null,
      startDate = null,
      endDate = null
    } = options;
    
    const params = {
      ticket_keys: ticketKeys.length > 0 ? ticketKeys.join(',') : undefined,
      assignee,
      start_date: startDate,
      end_date: endDate
    };

    const response = await api.get('/api/work-logs', { params });
    return response;
  } catch (error) {
    console.error('Get Work Logs Error:', error);
    throw error;
  }
};

export const getProjectDistribution = async (assignee, projects) => {
  try {
    const params = {
      ...(assignee && { assignee }),
      projects: projects.join(',')
    };
    
    const response = await api.get('/api/projects/distribution', { params });
    return response;
  } catch (error) {
    console.error('Get Project Distribution Error:', error);
    throw error;
  }
};

export const getPerformanceTrends = async (timeRange, projects, setIsLoader, setPerformanceTrends) => {
  try {
    setIsLoader(true);
    const params = {
      time_range: timeRange,
      projects: projects
    };
    
    const response = await api.get('/api/performance/trends', { params });
    setPerformanceTrends(response);
  } catch (error) {
    console.error('Get Performance Trends Error:', error);
    throw error;
  } finally {
    setIsLoader(false);
  }
};