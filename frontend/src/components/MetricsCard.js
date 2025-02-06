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
import InfoIcon from '@mui/icons-material/Info';


const timeRanges = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '1m', label: 'Last Month' },
  { value: '3m', label: 'Last 3 Months' },
  { value: '6m', label: 'Last 6 Months' },
  { value: 'all', label: 'All Time' }
];

export default function MetricsCard({ metrics, expanded = false }) {
  const [isExpanded, setIsExpanded] = React.useState(expanded);

  const formatHours = (hours) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h == 0 && m == 0) return `${h}h`
    if (h == 0 && m > 0) return `0h ${m}m`
    else if (m > 0) return `${h}h ${m}m`
    else return `${h}h`
  };

  const getVarianceColor = (variance) => {
    if (variance > 0) return 'success';
    if (variance < 0) return 'error';
    return 'warning';
  };

  const getVarianceText = (variance) => {
    if (variance > 0) return `${variance}%`;
    if (variance < 0) return `${variance}%`;
    return '0.00%';
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
          <Typography variant="subtitle2" gutterBottom>
            {timeRanges.find(item => item.value === metrics.day).label} Metrics
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Tooltip title="Total Working Hour">
              <Card sx={{ width: 175, height: 65 }}>
                <CardContent>
                  <Typography variant="h4" component="div" sx={{ fontSize: 14 }}>
                    Total Working Hour
                  </Typography>
                  <Typography sx={{ color: 'text.secondary', mb: 1.5 }}>{formatHours(metrics?.total_working_hour || 0)}</Typography>
                </CardContent>
              </Card>
            </Tooltip>
            <Tooltip title="Total assigned Hour">
              <Card sx={{ width: 175, height: 65 }}>
                <CardContent>
                  <Typography variant="h4" component="div" sx={{ fontSize: 14 }}>
                    Total Assigned Hour
                  </Typography>
                  <Typography sx={{ color: 'text.secondary', mb: 1.5 }}>{formatHours(metrics?.total_estimate || 0)}</Typography>
                </CardContent>
              </Card>
            </Tooltip>
            <Tooltip title="Current Logged Hour">
              <Card sx={{ width: 175, height: 65 }}>
                <CardContent>
                  <Typography variant="h4" component="div" sx={{ fontSize: 14 }}>
                    Current Logged Hour
                  </Typography>
                  <Typography sx={{ color: 'text.secondary', mb: 1.5 }}>{formatHours(metrics?.total_logged || 0)}</Typography>
                </CardContent>
              </Card>
            </Tooltip>

            <Tooltip title="Idle Hour">
              <Card sx={{ width: 175, height: 65 }}>
                <CardContent>
                  <Typography variant="h4" component="div" sx={{ fontSize: 14 }}>
                    Idle Hour
                  </Typography>
                  <Typography sx={{ color: 'text.secondary', mb: 1.5 }}>{formatHours(metrics?.idle_time || 0)}</Typography>
                </CardContent>
              </Card>
            </Tooltip>
          </Box>
        </Box>



        <Collapse in={isExpanded}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Time Metrics */}

            <Box>
              <Typography variant="caption" color="text.secondary">
                Work Progress Deviation
                <Tooltip title="This term reflects how much actual logged hours deviate from the original estimate in percentage">
                  <InfoIcon style={{ fontSize: 16, marginBottom: -2, marginLeft: 2 }} />
                </Tooltip>
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
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Workload Metrics
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Tooltip title="Average time to complete tickets">
                  <Card sx={{ width: 175, height: 65 }}>
                    <CardContent>
                      <Typography variant="h4" component="div" sx={{ fontSize: 14 }}>
                        Avg Time to Complete
                      </Typography>
                      <Typography sx={{ color: 'text.secondary', mb: 1.5 }}>{formatHours(metrics?.avg_time_to_complete)}</Typography>
                    </CardContent>
                  </Card>
                </Tooltip>
                <Tooltip title="Current tasks in progress">
                  <Card sx={{ width: 175, height: 65 }}>
                    <CardContent>
                      <Typography variant="h4" component="div" sx={{ fontSize: 14 }}>
                        Active Tasks
                      </Typography>
                      <Typography sx={{ color: 'text.secondary', mb: 1.5 }}>{metrics?.in_progress_tickets || 0}</Typography>
                    </CardContent>
                  </Card>
                </Tooltip>
                <Tooltip title="Tasks completed in the period">
                  <Card sx={{ width: 175, height: 65 }}>
                    <CardContent>
                      <Typography variant="h4" component="div" sx={{ fontSize: 14 }}>
                        Completed Tasks
                      </Typography>
                      <Typography sx={{ color: 'text.secondary', mb: 1.5 }}>{metrics?.completed_tickets || 0}</Typography>
                    </CardContent>
                  </Card>
                </Tooltip>
              </Box>
            </Box>

            {/* Workload Metrics */}
            {/* <Box>
              <Typography variant="subtitle2" gutterBottom>
                Workload Metrics
              </Typography> */}

          </Box>
        </Collapse>
      </CardContent>
    </Card >
  );
} 