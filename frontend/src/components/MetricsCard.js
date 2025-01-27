import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Tooltip,
  Collapse,
  IconButton
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';

export default function MetricsCard({ metrics, expanded = false }) {
  const [isExpanded, setIsExpanded] = React.useState(expanded);

  const formatHours = (hours) => {
    if (!hours) return '0h';
    return `${Math.round(hours)}h`;
  };

  const getVarianceColor = (variance) => {
    if (variance > 10) return 'error';
    if (variance < -10) return 'success';
    return 'warning';
  };

  const getVarianceText = (variance) => {
    if (variance > 0) return `${Math.abs(variance)}% over capacity`;
    if (variance < 0) return `${Math.abs(variance)}% under capacity`;
    return 'At capacity';
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Performance Metrics</Typography>
          <IconButton
            onClick={() => setIsExpanded(!isExpanded)}
            sx={{
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s'
            }}
          >
            <ExpandMoreIcon />
          </IconButton>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Schedule Variance
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinearProgress
              variant="determinate"
              value={Math.abs(metrics?.time_variance || 0)}
              color={getVarianceColor(metrics?.time_variance)}
              sx={{ height: 8, borderRadius: 4, flexGrow: 1 }}
            />
            <Typography variant="caption" sx={{ minWidth: 45 }}>
              {getVarianceText(metrics?.time_variance)}
            </Typography>
          </Box>
        </Box>

        <Collapse in={isExpanded}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Time Metrics */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Time Metrics
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Tooltip title="Average time to start working on tickets">
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Avg Time to Start
                    </Typography>
                    <Typography variant="body2">
                      {formatHours(metrics?.avg_time_to_start)}
                    </Typography>
                  </Box>
                </Tooltip>
                <Tooltip title="Average time to complete tickets">
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Avg Time to Complete
                    </Typography>
                    <Typography variant="body2">
                      {formatHours(metrics?.avg_time_to_complete)}
                    </Typography>
                  </Box>
                </Tooltip>
              </Box>
            </Box>

            {/* Workload Metrics */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Workload Metrics
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Tooltip title="Current tasks in progress">
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Active Tasks
                    </Typography>
                    <Typography variant="body2">
                      {metrics?.active_tasks || 0}
                    </Typography>
                  </Box>
                </Tooltip>
                <Tooltip title="Tasks completed in the period">
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Completed Tasks
                    </Typography>
                    <Typography variant="body2">
                      {metrics?.completed_tasks || 0}
                    </Typography>
                  </Box>
                </Tooltip>
              </Box>
            </Box>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
} 