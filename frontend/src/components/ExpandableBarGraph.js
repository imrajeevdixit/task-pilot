import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Collapse,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export default function ExpandableBarGraph({ data, dailyMetrics }) {
  const [expanded, setExpanded] = useState(false);
  const [metricType, setMetricType] = useState('efficiency');
  const [selectedEngineer, setSelectedEngineer] = useState('all');

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatHours = (hours) => {
    return `${Math.round(hours)}h`;
  };

  const formatPercent = (value) => {
    return `${Math.round(value)}%`;
  };

  // Filter metrics based on selected engineer
  const filteredMetrics = selectedEngineer === 'all' 
    ? dailyMetrics.team
    : dailyMetrics.engineers?.[selectedEngineer] || {};

  // Transform daily metrics for the chart
  const chartData = Object.entries(filteredMetrics || {}).map(([date, metrics]) => ({
    date: formatDate(date),
    efficiency: metrics.efficiency,
    loggedTime: metrics.logged_time,
    activeTasks: metrics.active_tasks,
    completedTasks: metrics.completed_tasks
  }));

  const metricConfigs = {
    efficiency: {
      label: 'Efficiency',
      color: '#8884d8',
      formatter: formatPercent
    },
    loggedTime: {
      label: 'Time Logged',
      color: '#82ca9d',
      formatter: formatHours
    },
    activeTasks: {
      label: 'Active Tasks',
      color: '#ff7300',
      formatter: (value) => value
    },
    completedTasks: {
      label: 'Completed Tasks',
      color: '#00C49F',
      formatter: (value) => value
    }
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BarChartIcon color="primary" />
            <Typography variant="h6">
              Performance Trends
            </Typography>
          </Box>
          <IconButton
            onClick={handleExpandClick}
            aria-expanded={expanded}
            aria-label="show graph"
            sx={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s'
            }}
          >
            <ExpandMoreIcon />
          </IconButton>
        </Box>

        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Filter by Engineer</InputLabel>
              <Select
                value={selectedEngineer}
                onChange={(e) => setSelectedEngineer(e.target.value)}
                label="Filter by Engineer"
              >
                <MenuItem value="all">All Engineers</MenuItem>
                {Object.keys(data || {}).map((name) => (
                  <MenuItem key={name} value={name}>{name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <ToggleButtonGroup
              value={metricType}
              exclusive
              onChange={(_, value) => value && setMetricType(value)}
              size="small"
            >
              {Object.entries(metricConfigs).map(([key, config]) => (
                <ToggleButton key={key} value={key}>
                  {config.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <Box sx={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis 
                  label={{ 
                    value: metricConfigs[metricType].label, 
                    angle: -90, 
                    position: 'insideLeft' 
                  }}
                />
                <RechartsTooltip
                  formatter={metricConfigs[metricType].formatter}
                  labelFormatter={formatDate}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey={metricType}
                  stroke={metricConfigs[metricType].color}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {selectedEngineer === 'all' 
                ? 'Showing trends for all engineers. Select an engineer to view individual performance.'
                : `Showing trends for ${selectedEngineer}. Switch back to "All Engineers" for team overview.`}
            </Typography>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
} 