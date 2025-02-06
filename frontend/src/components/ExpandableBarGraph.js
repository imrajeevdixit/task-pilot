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
  Tooltip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
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
  rect,
  Pattern,
  Tooltip as RechartsTooltip,
  ReferenceLine
} from 'recharts';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import BarChartIcon from '@mui/icons-material/BarChart';

export default function ExpandableBarGraph({ ALL_PROJECTS, performanceTrends, isLoader }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedView, setSelectedView] = useState('efficiency');
  const [selectProject, setSelectProject] = useState("")

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  const getRandomColor = () => {
    return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
  };

  // Format the data for charts
  const chartData = React.useMemo(() => {
    if (!performanceTrends?.trends?.daily_metrics) return [];

    return Object.keys(performanceTrends.trends.daily_metrics)
      .map((item) => {
        let obj = { date: item }

        ALL_PROJECTS.map(it => {
          obj[`${it}_meanDeviation`] = Number(performanceTrends.trends.daily_metrics?.[item]?.[it]?.mean_deviation || 0);
          obj[`${it}_stdDeviation`] = Number(performanceTrends.trends.daily_metrics?.[item]?.[it]?.std_deviation || 0)
          obj[`${it}_activeResources`] = Number(performanceTrends.trends.daily_metrics?.[item]?.[it]?.active_resources?.length || 0);
          obj[`${it}_idleResources`] = Number(performanceTrends.trends.daily_metrics?.[item]?.[it]?.idle_resources || 0)
          obj[`${it}_totalLogged`] = Number(performanceTrends.trends.daily_metrics?.[item]?.[it]?.avg_active_hours?.toFixed(2) || 0);
          obj[`${it}_idleHours`] = Number(performanceTrends.trends.daily_metrics?.[item]?.[it]?.avg_idle_hours?.toFixed(2) || 0)
        })
        return obj
      }).sort((a, b) => {
        return parseInt(a.date.replace("Week", "")) - parseInt(b.date.replace("Week", ""));
      });

  }, [performanceTrends]);

  const chartDataEpicMetrics = React.useMemo(() => {
    if (!performanceTrends?.epic_metrics) return { projects: [], epic_metrics: [] }

    return {
      projects: [selectProject],
      epic_metrics: Object.keys(performanceTrends.epic_metrics)
        .map((item) => {
          if (item.split("-")[0] === selectProject) {
            let obj = { epic_metrics: item }

            Object.keys(performanceTrends.epic_metrics[item]).map(it => {
              obj.overallProgress = (Number(
                (performanceTrends.epic_metrics?.[item]?.done + performanceTrends.epic_metrics?.[item]?.closed) /
                performanceTrends.epic_metrics?.[item]?.total_tasks) * 100)?.toFixed(2)
              obj.breachedTask = Number(performanceTrends.epic_metrics?.[item]?.breached_tasks)
              obj.averageDelta = Number(performanceTrends.epic_metrics?.[item]?.avg_delay_days)
              obj.riskEstimate = performanceTrends.epic_metrics?.[item]?.risk_estimate
            })
            return obj
          }
        }).filter(Boolean)
    }

  }, [performanceTrends, selectProject]);

  const projectColors = { 
    TEST: "#f5a185",
    TEC: "#3fd8d1",
    THC: "#e8873e",
    TPC: "#ac8332",
    TPO: "#6aecc6",
    TWCP: "#18e94a",
   }

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
          {isLoader ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* View Selection */}
              <Box sx={{ mb: 5 }}>
                <ToggleButtonGroup
                  value={selectedView}
                  exclusive
                  onChange={(_, value) => value && setSelectedView(value)}
                  size="small"
                  style={{ display: "block" }}
                >
                  <Tooltip title="Represents the average absolute deviation from the estimated value.">
                    <ToggleButton value="efficiency">Estimation Accuracy</ToggleButton>
                  </Tooltip>
                  <Tooltip title="Represents the average absolute deviation from the estimated value.">
                    <ToggleButton value="resources">Resource Distribution</ToggleButton>
                  </Tooltip>
                  <Tooltip title="Represents the average absolute deviation from the estimated value.">
                    <ToggleButton value="hours">Time Analysis</ToggleButton>
                  </Tooltip>
                  <Tooltip title="Represents the average absolute deviation from the estimated value.">
                    <ToggleButton value="epic">Epic Analysis</ToggleButton>
                  </Tooltip>
                  <div style={{ float: "right" }}>
                    <div style={{ display: 'flex', flexDirection: 'row', marginLeft: '10px' }}>
                      {['efficiency', 'hours'].includes(selectedView) && (<>
                        <Tooltip title={selectedView === "efficiency" ?
                          "Shows the variation from the mean. Represents the spread of data." :
                          "Idle Hours in %"
                        }>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px', cursor: 'pointer' }}>
                            <div
                              style={{
                                width: '20px',
                                height: '3px',
                                marginRight: '5px',
                                borderBottom: '3px dashed'
                              }}
                            />
                            <span>{selectedView === "efficiency" ? "Standard Deviation" : "Idle Hours in %"}</span>
                          </div>
                        </Tooltip>

                        <Tooltip title={selectedView === "efficiency" ?
                          "Represents the average absolute deviation from the estimated value." :
                          "Idle Hours in %"
                        }>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px', marginLeft: "10px", cursor: 'pointer' }}>
                            <div
                              style={{
                                width: '20px',
                                height: '3px',
                                marginRight: '5px',
                                borderBottom: '3px solid'
                              }}
                            />
                            <span>{selectedView === "efficiency" ? "Mean Deviation" : "Total Logged Hours in %"}</span>
                          </div>
                        </Tooltip>
                      </>)}
                      {selectedView === "epic" && [{ title: "", value: "OverAll Progress(%)", color: "#2ee816" }, { title: "", value: "Breached Task", color: "#117f74" }, { title: "", value: "Average Delta in Days", color: "#3cc8c9" }, { title: "", value: "Risk Estimate", color: "#a7768a" }].map((item) => (
                        <Tooltip title={item.title}>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px', marginLeft: "10px", cursor: 'pointer' }}>
                            <div
                              style={{
                                width: '20px',
                                height: '3px',
                                marginRight: '5px',
                                borderBottom: `4px solid ${item.color}`
                              }}
                            />
                            <span>{item.value}</span>
                          </div>
                        </Tooltip>
                      ))}
                    </div>
                    {selectedView === "epic" && (
                      <div style={{ float: "right", marginBottom: 15 }}>
                        <FormControl sx={{ minWidth: 200 }}>
                          <InputLabel>Select Project</InputLabel>
                          <Select
                            value={selectProject}
                            onChange={(e) => setSelectProject(e.target.value)}
                            label="Select Project"
                            style={{ height: 50, width: 200 }}
                          >
                            {ALL_PROJECTS.map((project) => (
                              <MenuItem key={project} value={project}>
                                {project}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </div>
                    )}
                  </div>
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
                      />
                      <YAxis
                        domain={['auto', 'auto']}
                        label={{
                          value: 'Deviation from Estimates (%)',
                          angle: -90,
                          position: 'insideLeft',
                          offset: 2
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
                      <Legend />
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
                      {ALL_PROJECTS.map((item) => (
                        <>
                          <Line
                            type="monotone"
                            stroke={projectColors[item]}
                            name={item}
                            dot={false}
                            strokeWidth={2}
                            TooltipType="none"
                          />
                          <Line
                            type="monotone"
                            dataKey={`${item}_meanDeviation`}
                            stroke={projectColors[item]}
                            name={`${item} Mean Deviation`}
                            dot={false}
                            strokeWidth={2}
                            TooltipType="none"
                            legendType="none"
                          />
                          <Line
                            type="monotone"
                            dataKey={`${item}_stdDeviation`}
                            stroke={projectColors[item]}
                            name={`${item} Standard Deviation`}
                            dot={false}
                            strokeWidth={2}
                            strokeDasharray="10 5"
                            legendType="none"
                          />
                        </>
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}

                {selectedView === 'resources' && (
                  <ResponsiveContainer>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis
                        domain={['auto', 'auto']}
                        label={{
                          value: 'Number of Resources',
                          angle: -90,
                          position: 'insideLeft',
                          offset: 2
                        }}
                      />
                      <RechartsTooltip />
                      <Legend />
                      {ALL_PROJECTS.map((item) => (
                        <>
                          <Bar
                            fill={projectColors[item]}
                            name={item}
                          />
                          <Bar
                            dataKey={`${item}_activeResources`}
                            fill={projectColors[item]}
                            name={`${item} Active Resources`}
                            legendType="none"
                          />
                          <Bar
                            dataKey={`${item}_idleResources`}
                            fill={projectColors[item]}
                            name={`${item} Idle Resources`}
                            strokeDasharray="10 5"
                            legendType="none"
                          />
                        </>
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {selectedView === 'hours' && (
                  <ResponsiveContainer>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis
                        domain={['auto', 'auto']}
                        label={{
                          value: 'Time Analysis',
                          angle: -90,
                          position: 'insideLeft',
                          offset: 2
                        }}
                      />
                      <RechartsTooltip />
                      <Legend />
                      {ALL_PROJECTS.map((item) => (
                        <>
                          <Area
                            type="monotone"
                            stackId="1"
                            stroke={projectColors[item]}
                            fill={projectColors[item]}
                            name={item}
                          />
                          <Area
                            type="monotone"
                            dataKey={`${item}_totalLogged`}
                            stackId="1"
                            stroke={projectColors[item]}
                            fill={projectColors[item]}
                            name={`${item} Total Logged Hours in %`}
                            legendType="none"
                          />
                          <Area
                            type="monotone"
                            dataKey={`${item}_idleHours`}
                            stackId="1"
                            stroke={projectColors[item]}
                            fill={projectColors[item]}
                            name={`${item} Idle Hours in %`}
                            strokeDasharray="10 5"
                            legendType="none"
                          />
                        </>
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                )}

                {selectedView === 'epic' && (
                  <>
                    {selectProject == "" && <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100vw" }}>No Project is selected</div>}
                    {(selectProject && chartDataEpicMetrics?.epic_metrics?.length === 0) && <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100vw" }}>There will be no data.</div>}
                    {selectProject && chartDataEpicMetrics?.epic_metrics?.length > 0 &&
                      (
                        <ResponsiveContainer>
                          <LineChart data={chartDataEpicMetrics.epic_metrics}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="epic_metrics"
                            />
                            <YAxis
                              domain={['auto', 'auto']}
                              label={{
                                value: 'Epic Wise Metrics',
                                angle: -90,
                                position: 'insideLeft',
                                offset: 2
                              }}
                              tickFormatter={(value) => `${value.toFixed(0)}%`}
                            />
                            <RechartsTooltip />
                            <Legend />
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
                              dataKey="overallProgress"
                              stroke="#2ee816"
                              name="OverAll Progress(%)"
                              dot={false}
                              strokeWidth={2}
                              TooltipType="none"
                              legendType="none"
                            />
                            <Line
                              type="monotone"
                              dataKey="breachedTask"
                              stroke="#117f74"
                              name="Breached Task"
                              dot={false}
                              strokeWidth={2}
                              TooltipType="none"
                              legendType="none"
                            />
                            <Line
                              type="monotone"
                              dataKey="averageDelta"
                              stroke="#3cc8c9"
                              name="Average Delta in Days"
                              dot={false}
                              strokeWidth={2}
                              TooltipType="none"
                              legendType="none"
                            />
                            <Line
                              type="monotone"
                              dataKey="riskEstimate"
                              stroke="#a7768a"
                              name="Risk Estimate"
                              dot={false}
                              strokeWidth={2}
                              TooltipType="none"
                              legendType="none"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                  </>
                )}
              </Box>
            </>)}
        </Collapse>
      </CardContent>
    </Card>
  );
} 