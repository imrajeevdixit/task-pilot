import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Collapse,
  ToggleButtonGroup,
  ToggleButton,
  Grid,
  Tooltip
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip,
  ReferenceLine
} from 'recharts';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import BarChartIcon from '@mui/icons-material/BarChart';

export default function ExpandableBarGraph({ performanceTrends }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedView, setSelectedView] = useState('efficiency');

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  // Format the data for charts
  const chartData = React.useMemo(() => {
    if (!performanceTrends?.trends?.daily_metrics) return [];
    
    return Object.entries(performanceTrends.trends.daily_metrics)
      .map(([date, metrics]) => {
        // Ensure all numeric values are properly converted to numbers
        const resourceUtilization = metrics.total_resources_count > 0 
          ? (metrics.total_logged / (8 * metrics.total_resources_count)) * 100 
          : 0;

        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          meanDeviation: Number(metrics.mean_deviation || 0),
          stdDeviation: Number(metrics.std_deviation || 0),
          resourceUtilization: Number(resourceUtilization.toFixed(1)),
          activeResources: Number(metrics.active_resources.length || 0),
          idleResources: Number(metrics.idle_resources || 0),
          totalLogged: Number(metrics.total_logged || 0),
          idleHours: Number(metrics.idle_hours || 0),
          totalEstimate: Number(metrics.total_estimate || 0),
          avgHoursPerResource: Number(metrics.avg_hours_per_resource || 0)
        };
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [performanceTrends]);

  const summary = performanceTrends?.trends?.summary || {};

  const MetricCard = ({ title, value, description, format = 'number' }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography color="textSecondary" variant="subtitle2">
            {title}
          </Typography>
          <Tooltip title={description}>
            <IconButton size="small">
              <BarChartIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Typography variant="h4" component="div">
          {format === 'percent' ? `${Number(value).toFixed(1)}%` :
           format === 'hours' ? `${Number(value).toFixed(1)}h` :
           Number(value).toFixed(1)}
        </Typography>
      </CardContent>
    </Card>
  );

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

        <Collapse in={expanded}>
          {/* Summary Metrics */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <MetricCard
                title="Estimation Bias"
                value={summary.mean_deviation}
                description={`On average, tasks are ${Math.abs(summary.mean_deviation || 0).toFixed(1)}% ${(summary.mean_deviation || 0) > 0 ? 'overestimated' : 'underestimated'}`}
                format="percent"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <MetricCard
                title="Estimation Consistency (σ)"
                value={summary.std_deviation}
                description="Standard deviation of estimates - lower values indicate more consistent estimation accuracy"
                format="percent"
              />
            </Grid>
          </Grid>

          {/* View Selection */}
          <Box sx={{ mb: 3 }}>
            <ToggleButtonGroup
              value={selectedView}
              exclusive
              onChange={(_, value) => value && setSelectedView(value)}
              size="small"
            >
              <ToggleButton value="efficiency">Estimation Accuracy</ToggleButton>
              <ToggleButton value="resources">Resource Distribution</ToggleButton>
              <ToggleButton value="hours">Time Analysis</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Charts */}
          <Box sx={{ height: 400 }}>
            {selectedView === 'efficiency' && (
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date"
                    label={{ 
                      value: 'Date', 
                      position: 'insideBottom', 
                      offset: -5 
                    }}
                  />
                  <YAxis 
                    domain={['auto', 'auto']}
                    label={{ 
                      value: 'Deviation from Estimates (%)', 
                      angle: -90, 
                      position: 'insideLeft',
                      offset: 10
                    }}
                    tickFormatter={(value) => `${value.toFixed(0)}%`}
                  />
                  <RechartsTooltip 
                    formatter={(value, name) => {
                      const numValue = Number(value);
                      if (isNaN(numValue)) return ['-', name];
                      
                      let label;
                      if (name === 'meanDeviation') {
                        label = 'Mean Deviation';
                        const direction = numValue > 0 ? 'overestimated' : 'underestimated';
                        return [`${Math.abs(numValue).toFixed(1)}% ${direction}`, label];
                      } else if (name === 'stdDeviation') {
                        label = 'Consistency (σ)';
                        return [`±${numValue.toFixed(1)}%`, label];
                      }
                      return [`${numValue.toFixed(1)}%`, name];
                    }}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend 
                    formatter={(value) => {
                      if (value === 'meanDeviation') return 'Estimation Bias';
                      if (value === 'stdDeviation') return 'Consistency (σ)';
                      return value;
                    }}
                  />
                  <ReferenceLine 
                    y={0} 
                    stroke="#666" 
                    strokeDasharray="3 3"
                    label={{ 
                      value: 'Perfect Estimation', 
                      position: 'right',
                      fill: '#666',
                      fontSize: 12
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="meanDeviation"
                    stroke="#8884d8"
                    name="meanDeviation"
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="stdDeviation"
                    stroke="#82ca9d"
                    name="stdDeviation"
                    dot={false}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}

            {selectedView === 'resources' && (
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar
                    dataKey="activeResources"
                    fill="#8884d8"
                    name="Active Resources"
                  />
                  <Bar
                    dataKey="idleResources"
                    fill="#82ca9d"
                    name="Idle Resources"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}

            {selectedView === 'hours' && (
              <ResponsiveContainer>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="totalLogged"
                    stackId="1"
                    stroke="#8884d8"
                    fill="#8884d8"
                    name="Hours Logged"
                  />
                  <Area
                    type="monotone"
                    dataKey="idleHours"
                    stackId="1"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    name="Idle Hours"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
} 