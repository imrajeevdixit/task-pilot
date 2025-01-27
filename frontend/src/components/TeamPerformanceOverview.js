import { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput
} from '@mui/material';
import {
  AccessTime as AccessTimeIcon,
  Timeline as TimelineIcon,
  Assignment as AssignmentIcon,
  HourglassEmpty as IdleIcon
} from '@mui/icons-material';

export default function TeamPerformanceOverview({ engineersData }) {
  const [selectedEngineers, setSelectedEngineers] = useState([]);

  const formatHours = (hours) => {
    const days = Math.floor(hours / 8);
    const remainingHours = Math.round(hours % 8);
    if (days === 0) return `${remainingHours}h`;
    return `${days}d ${remainingHours}h`;
  };

  // Calculate averages based on selected engineers or all engineers
  const calculateMetrics = () => {
    const engineers = selectedEngineers.length > 0 
      ? Object.entries(engineersData).filter(([name]) => selectedEngineers.includes(name))
      : Object.entries(engineersData);

    if (engineers.length === 0) return null;

    return engineers.reduce((acc, [_, data]) => ({
      estimated: acc.estimated + data.total_estimate,
      logged: acc.logged + data.total_logged,
      currentWork: acc.currentWork + data.current_work,
      idleTime: acc.idleTime + data.idle_time,
      count: acc.count + 1
    }), {
      estimated: 0,
      logged: 0,
      currentWork: 0,
      idleTime: 0,
      count: 0
    });
  };

  const metrics = calculateMetrics();
  const averageMetrics = metrics ? {
    estimated: metrics.estimated / metrics.count,
    logged: metrics.logged / metrics.count,
    currentWork: metrics.currentWork / metrics.count,
    idleTime: metrics.idleTime / metrics.count
  } : null;

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Team Performance Overview</Typography>
          <FormControl sx={{ minWidth: 300 }}>
            <InputLabel>Filter Engineers</InputLabel>
            <Select
              multiple
              value={selectedEngineers}
              onChange={(e) => setSelectedEngineers(e.target.value)}
              input={<OutlinedInput label="Filter Engineers" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} />
                  ))}
                </Box>
              )}
            >
              {Object.keys(engineersData).map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {averageMetrics && (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ 
                p: 2, 
                bgcolor: 'background.paper', 
                borderRadius: 1,
                boxShadow: 1
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AccessTimeIcon color="primary" />
                  <Typography variant="subtitle2">Average Estimated Time</Typography>
                </Box>
                <Typography variant="h6">{formatHours(averageMetrics.estimated)}</Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ 
                p: 2, 
                bgcolor: 'background.paper', 
                borderRadius: 1,
                boxShadow: 1
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <TimelineIcon color="secondary" />
                  <Typography variant="subtitle2">Average Logged Time</Typography>
                </Box>
                <Typography variant="h6">{formatHours(averageMetrics.logged)}</Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ 
                p: 2, 
                bgcolor: 'background.paper', 
                borderRadius: 1,
                boxShadow: 1
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AssignmentIcon color="info" />
                  <Typography variant="subtitle2">Average Current Work</Typography>
                </Box>
                <Typography variant="h6">{formatHours(averageMetrics.currentWork)}</Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ 
                p: 2, 
                bgcolor: 'background.paper', 
                borderRadius: 1,
                boxShadow: 1
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <IdleIcon color="warning" />
                  <Typography variant="subtitle2">Average Idle Time</Typography>
                </Box>
                <Typography variant="h6">{formatHours(averageMetrics.idleTime)}</Typography>
              </Box>
            </Grid>
          </Grid>
        )}
      </CardContent>
    </Card>
  );
} 