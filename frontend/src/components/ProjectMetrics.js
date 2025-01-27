import { Box, Typography, LinearProgress, Grid, Tooltip } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

export default function ProjectMetrics({ projects }) {
  const projectData = Object.entries(projects).map(([project, metrics]) => ({
    name: project,
    'Estimated Hours': Number(metrics.total_estimate.toFixed(2)),
    'Logged Hours': Number(metrics.total_logged.toFixed(2)),
    'Current Work': Number(metrics.current_work.toFixed(2)),
    'Idle Time': Number(metrics.idle_time.toFixed(2))
  }));

  const formatHours = (hours) => {
    const days = Math.floor(hours / 8);
    const remainingHours = Math.round(hours % 8);
    if (days === 0) return `${remainingHours}h`;
    return `${days}d ${remainingHours}h`;
  };

  const getVarianceColor = (variance) => {
    if (variance <= -20) return 'error';
    if (variance < 0) return 'warning';
    return 'success';
  };

  const getVarianceText = (variance) => {
    if (variance > 0) return `${Math.abs(variance)}% ahead of schedule`;
    if (variance < 0) return `${Math.abs(variance)}% behind schedule`;
    return 'On schedule';
  };

  return (
    <Box>
      {/* Bar Graph View */}
      <Box sx={{ height: 300, mb: 4 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={projectData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
            <RechartsTooltip />
            <Legend />
            <Bar dataKey="Estimated Hours" fill="#8884d8" />
            <Bar dataKey="Logged Hours" fill="#82ca9d" />
            <Bar dataKey="Current Work" fill="#ffc658" />
            <Bar dataKey="Idle Time" fill="#ff8042" />
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {/* Detailed Metrics View */}
      {Object.entries(projects).map(([project, data]) => (
        <Box key={project} sx={{ mb: 3, bgcolor: 'background.paper', p: 2, borderRadius: 1 }}>
          <Typography variant="subtitle1" gutterBottom color="primary">
            {project}
          </Typography>
          
          {/* Time Metrics */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} sm={3}>
              <Tooltip title="Total Estimated Time for this Project">
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Estimated
                  </Typography>
                  <Typography variant="body2">
                    {formatHours(data.total_estimate)}
                  </Typography>
                </Box>
              </Tooltip>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Tooltip title="Total Time Logged in this Project">
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Logged
                  </Typography>
                  <Typography variant="body2">
                    {formatHours(data.total_logged)}
                  </Typography>
                </Box>
              </Tooltip>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Tooltip title="Idle Time in this Project">
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Idle Time
                  </Typography>
                  <Typography variant="body2">
                    {formatHours(data.idle_time)}
                  </Typography>
                </Box>
              </Tooltip>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Tooltip title="Current Work in Progress">
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    In Progress
                  </Typography>
                  <Typography variant="body2">
                    {formatHours(data.current_work)}
                  </Typography>
                </Box>
              </Tooltip>
            </Grid>
          </Grid>

          {/* Time Variance (replacing Project Efficiency) */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Schedule Variance
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LinearProgress
                variant="determinate"
                value={Math.abs(data.time_variance)}
                color={getVarianceColor(data.time_variance)}
                sx={{ height: 8, borderRadius: 4, flexGrow: 1 }}
              />
              <Typography variant="caption" sx={{ minWidth: 45 }}>
                {getVarianceText(data.time_variance)}
              </Typography>
            </Box>
          </Box>

          {/* Project Bandwidth */}
          <Box>
            <Typography variant="caption" color="text.secondary">
              Project Bandwidth
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LinearProgress
                variant="determinate"
                value={Math.min(data.bandwidth, 100)}
                color={data.bandwidth > 100 ? 'error' : 'primary'}
                sx={{ height: 8, borderRadius: 4, flexGrow: 1 }}
              />
              <Typography variant="caption" sx={{ minWidth: 45 }}>
                {Math.round(data.bandwidth)}%
              </Typography>
            </Box>
            {data.bandwidth > 100 && (
              <Typography variant="caption" color="error">
                Overloaded by {Math.round(data.bandwidth - 100)}%
              </Typography>
            )}
          </Box>
        </Box>
      ))}
    </Box>
  );
} 