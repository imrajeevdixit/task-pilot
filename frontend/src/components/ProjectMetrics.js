import { Box, Divider, Typography } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ProjectMetrics({ projects }) {
  const projectData = Object.entries(projects).map(([project, metrics]) => ({
    project,
    estimate: metrics.total_estimate,
    logged: metrics.total_logged,
    idle: metrics.idle_time,
    bandwidth: metrics.bandwidth,
  }));

  return (
    <Box sx={{ mt: 3 }}>
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle1" gutterBottom>
        Project-wise Metrics
      </Typography>
      <Box sx={{ height: 300, mt: 2 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={projectData}>
            <XAxis dataKey="project" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="estimate" name="Estimate" fill="#8884d8" />
            <Bar dataKey="logged" name="Logged" fill="#82ca9d" />
            <Bar dataKey="idle" name="Idle" fill="#ffc658" />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
} 