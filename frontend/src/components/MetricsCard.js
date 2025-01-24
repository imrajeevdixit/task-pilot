import { Box, Grid, Typography, LinearProgress } from '@mui/material';

export default function MetricsCard({ metrics }) {
  return (
    <Box sx={{ mt: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="subtitle2" color="text.secondary">Bandwidth</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: '100%', mr: 1 }}>
              <LinearProgress 
                variant="determinate" 
                value={Math.min(metrics.bandwidth, 100)} 
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Box>
            <Box sx={{ minWidth: 35 }}>
              <Typography variant="body2" color="text.secondary">
                {`${Math.round(metrics.bandwidth)}%`}
              </Typography>
            </Box>
          </Box>
        </Grid>
        <Grid item xs={6} md={3}>
          <Typography variant="subtitle2" color="text.secondary">
            Estimated Hours
          </Typography>
          <Typography variant="h6">
            {metrics.total_estimate.toFixed(1)}
          </Typography>
        </Grid>
        <Grid item xs={6} md={3}>
          <Typography variant="subtitle2" color="text.secondary">
            Logged Hours
          </Typography>
          <Typography variant="h6">
            {metrics.total_logged.toFixed(1)}
          </Typography>
        </Grid>
        <Grid item xs={6} md={3}>
          <Typography variant="subtitle2" color="text.secondary">
            Idle Hours
          </Typography>
          <Typography variant="h6">
            {metrics.idle_time.toFixed(1)}
          </Typography>
        </Grid>
        <Grid item xs={6} md={3}>
          <Typography variant="subtitle2" color="text.secondary">
            Current Work
          </Typography>
          <Typography variant="h6">
            {metrics.current_work.toFixed(1)}
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
} 