import React from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { Box, Typography, Grid, Paper, ToggleButtonGroup, ToggleButton } from '@mui/material';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function ProjectDistributionChart({ currentTickets = [], completedTickets = [], selectedEngineer }) {
  const [viewType, setViewType] = React.useState('pie');

  // Process tickets to get project distribution data
  const projectData = React.useMemo(() => {
    const data = {};
    
    // Process current tickets
    currentTickets.forEach(ticket => {
      const project = ticket.key.split('-')[0];
      
      if (!data[project]) {
        data[project] = {
          total_logged: 0,
          total_estimate: 0,
          ticket_count: 0,
          active_count: 0,
          completed_count: 0
        };
      }
      
      data[project].total_logged += ticket.logged || 0;
      data[project].total_estimate += ticket.estimate || 0;
      data[project].ticket_count += 1;
      data[project].active_count += 1;
    });

    // Process completed tickets
    completedTickets.forEach(ticket => {
      const project = ticket.key.split('-')[0];
      
      if (!data[project]) {
        data[project] = {
          total_logged: 0,
          total_estimate: 0,
          ticket_count: 0,
          active_count: 0,
          completed_count: 0
        };
      }
      
      data[project].total_logged += ticket.logged || 0;
      data[project].total_estimate += ticket.estimate || 0;
      data[project].ticket_count += 1;
      data[project].completed_count += 1;
    });

    // Calculate bandwidth percentages
    const totalLogged = Object.values(data).reduce((sum, proj) => sum + proj.total_logged, 0);
    if (totalLogged > 0) {
      Object.values(data).forEach(proj => {
        proj.bandwidth = (proj.total_logged / totalLogged) * 100;
      });
    }

    return data;
  }, [currentTickets, completedTickets]);

  // Calculate aggregated metrics
  const aggregatedMetrics = React.useMemo(() => {
    const totals = {
      projects: Object.keys(projectData).length,
      tickets: currentTickets.length + completedTickets.length,
      completed: completedTickets.length,
      active: currentTickets.length,
      logged: Object.values(projectData).reduce((sum, proj) => sum + proj.total_logged, 0),
      estimated: Object.values(projectData).reduce((sum, proj) => sum + proj.total_estimate, 0)
    };

    return {
      ...totals,
      completionRate: totals.tickets > 0 ? 
        Math.round((totals.completed / totals.tickets) * 100) : 0
    };
  }, [projectData, currentTickets.length, completedTickets.length]);

  const chartData = Object.entries(projectData).map(([project, metrics]) => ({
    name: project,
    value: metrics.total_logged,
    bandwidth: metrics.bandwidth || 0,
    estimate: metrics.total_estimate,
    totalTickets: metrics.ticket_count,
    activeTickets: metrics.active_count,
    completedTickets: metrics.completed_count,
    efficiency: metrics.total_estimate > 0 ? 
      (metrics.total_logged / metrics.total_estimate * 100).toFixed(1) : 0
  })).filter(item => item.totalTickets > 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            {data.name}
          </Typography>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Typography variant="body2">
                Time Logged: {data.value.toFixed(1)}h ({data.bandwidth.toFixed(1)}%)
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2">
                Time Estimated: {data.estimate.toFixed(1)}h
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2">
                Efficiency: {data.efficiency}%
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2">
                Total Tickets: {data.totalTickets}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" color="success.main">
                Completed: {data.completedTickets}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" color="info.main">
                Active: {data.activeTickets}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      );
    }
    return null;
  };

  const renderSummaryMetrics = () => (
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid item xs={12} sm={4}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Total Projects
          </Typography>
          <Typography variant="h4">
            {aggregatedMetrics.projects}
          </Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} sm={4}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Total Tickets
          </Typography>
          <Typography variant="h4">
            {aggregatedMetrics.tickets}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Active: {aggregatedMetrics.active} | Completed: {aggregatedMetrics.completed}
          </Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} sm={4}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Completion Rate
          </Typography>
          <Typography variant="h4">
            {aggregatedMetrics.completionRate}%
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  );

  const renderChart = () => {
    if (viewType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name, bandwidth }) => `${name} (${bandwidth.toFixed(1)}%)`}
            >
              {chartData.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="activeTickets" name="Active" fill="#1976d2" stackId="tickets" />
          <Bar dataKey="completedTickets" name="Completed" fill="#2e7d32" stackId="tickets" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  if (chartData.length === 0) {
    return (
      <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">
          No project data available
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {renderSummaryMetrics()}
      
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
        <ToggleButtonGroup
          value={viewType}
          exclusive
          onChange={(_, value) => value && setViewType(value)}
          size="small"
        >
          <ToggleButton value="pie">Time Distribution</ToggleButton>
          <ToggleButton value="bar">Ticket Distribution</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {renderChart()}
    </Box>
  );
} 