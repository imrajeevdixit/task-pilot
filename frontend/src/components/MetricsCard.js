import { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  IconButton,
  Collapse,
  Divider,
  LinearProgress,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  AccessTime as AccessTimeIcon,
  Speed as SpeedIcon,
  Timeline as TimelineIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import ProjectMetrics from './ProjectMetrics';

export default function MetricsCard({ metrics, expanded = false }) {
  const [isExpanded, setIsExpanded] = useState(expanded);

  const handleExpandClick = () => {
    setIsExpanded(!isExpanded);
  };

  const formatHours = (hours) => {
    const days = Math.floor(hours / 8);
    const remainingHours = Math.round(hours % 8);
    if (days === 0) return `${remainingHours}h`;
    return `${days}d ${remainingHours}h`;
  };

  const calculateEfficiency = (logged, estimated) => {
    if (!estimated) return 0;
    return (logged / estimated) * 100;
  };

  const getEfficiencyColor = (efficiency) => {
    if (efficiency <= 70) return 'error';
    if (efficiency <= 90) return 'warning';
    return 'success';
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Tooltip title="Total Estimated Time">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTimeIcon color="primary" />
                  <Typography variant="body2">
                    Estimated: {formatHours(metrics.total_estimate)}
                  </Typography>
                </Box>
              </Tooltip>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Tooltip title="Total Time Logged">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TimelineIcon color="secondary" />
                  <Typography variant="body2">
                    Logged: {formatHours(metrics.total_logged)}
                  </Typography>
                </Box>
              </Tooltip>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Tooltip title="Current Work in Progress">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssignmentIcon color="info" />
                  <Typography variant="body2">
                    In Progress: {formatHours(metrics.current_work)}
                  </Typography>
                </Box>
              </Tooltip>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Tooltip title="Current Bandwidth">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SpeedIcon color="warning" />
                  <Typography variant="body2">
                    Bandwidth: {Math.round(metrics.bandwidth)}%
                  </Typography>
                </Box>
              </Tooltip>
            </Grid>
          </Grid>
          <IconButton
            onClick={handleExpandClick}
            aria-expanded={isExpanded}
            aria-label="show more"
            sx={{
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s'
            }}
          >
            <ExpandMoreIcon />
          </IconButton>
        </Box>

        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Detailed Insights
            </Typography>
            
            {/* Efficiency Rate */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Work Efficiency Rate
              </Typography>
              <LinearProgress
                variant="determinate"
                value={calculateEfficiency(metrics.total_logged, metrics.total_estimate)}
                color={getEfficiencyColor(calculateEfficiency(metrics.total_logged, metrics.total_estimate))}
                sx={{ height: 10, borderRadius: 5 }}
              />
              <Typography variant="caption" color="text.secondary">
                {Math.round(calculateEfficiency(metrics.total_logged, metrics.total_estimate))}% of estimated time utilized
              </Typography>
            </Box>

            {/* Idle Time Analysis */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Idle Time Analysis
              </Typography>
              <Typography variant="body2">
                Total Idle Time: {formatHours(metrics.idle_time)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Time between tasks or waiting for assignments
              </Typography>
            </Box>

            {/* Workload Distribution */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Current Workload
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(metrics.bandwidth, 100)}
                color={metrics.bandwidth > 100 ? 'error' : 'primary'}
                sx={{ height: 10, borderRadius: 5 }}
              />
              <Typography variant="caption" color="text.secondary">
                {metrics.bandwidth > 100 
                  ? `Overloaded by ${Math.round(metrics.bandwidth - 100)}%`
                  : `${Math.round(metrics.bandwidth)}% of capacity utilized`}
              </Typography>
            </Box>

            {/* Project Distribution Section */}
            {metrics.projects && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Project-wise Metrics
                </Typography>
                <ProjectMetrics projects={metrics.projects} />
              </Box>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
} 