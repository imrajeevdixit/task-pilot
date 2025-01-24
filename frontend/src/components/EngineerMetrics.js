import { Box, Grid, Typography } from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';

export default function EngineerMetrics({ data }) {
  const engineerData = Object.entries(data).map(([name, metrics]) => ({
    name,
    bandwidth: metrics.bandwidth,
    estimatedHours: metrics.total_estimate,
    loggedHours: metrics.total_logged,
    idleHours: metrics.idle_time
  }));

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Box sx={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={engineerData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="bandwidth" name="Bandwidth %" fill="#8884d8" />
                <Bar dataKey="estimatedHours" name="Estimated Hours" fill="#82ca9d" />
                <Bar dataKey="loggedHours" name="Logged Hours" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
} 