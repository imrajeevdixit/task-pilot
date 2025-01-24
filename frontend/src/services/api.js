import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:5000';

export const getDashboardData = async (timeRange, projects, assignees = '') => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/dashboard`, {
      params: {
        time_range: timeRange,
        projects: projects,
        assignees: assignees
      },
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