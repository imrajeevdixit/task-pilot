import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Box, Container, Grid, Paper, Typography, FormControl, 
  InputLabel, Select, MenuItem, OutlinedInput, Chip,
  CircularProgress, Alert, Card, CardContent,
  Checkbox, Button, ListItemText, List, ListItem, ListItemButton,
  Divider
} from '@mui/material';
import { getDashboardData } from '../services/api';
import MetricsCard from './MetricsCard';
import ProjectMetrics from './ProjectMetrics';
import EngineerMetrics from './EngineerMetrics';
import AssigneeSelect from './AssigneeSelect';
import ExpandableBarGraph from './ExpandableBarGraph';

const timeRanges = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '1m', label: 'Last Month' },
  { value: '3m', label: 'Last 3 Months' },
  { value: '6m', label: 'Last 6 Months' },
  { value: 'all', label: 'All Time' }
];

const ALL_PROJECTS = ['THC', 'TEC', 'TP', 'TWCP', 'TPO'];

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState('1m');
  const [selectedProjects, setSelectedProjects] = useState(ALL_PROJECTS);
  const [tempSelectedProjects, setTempSelectedProjects] = useState(ALL_PROJECTS);
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [selectedEngineer, setSelectedEngineer] = useState(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', timeRange, selectedProjects, selectedAssignees],
    queryFn: () => getDashboardData(
      timeRange, 
      selectedProjects.join(','),
      selectedAssignees.map(a => a.accountId).join(',')
    ),
    enabled: true, // Query will not auto-run
  });

  const handleProjectChange = (event) => {
    const value = event.target.value;
    if (value.includes('ALL')) {
      if (tempSelectedProjects.length === ALL_PROJECTS.length) {
        setTempSelectedProjects([]);
      } else {
        setTempSelectedProjects(ALL_PROJECTS);
      }
    } else {
      setTempSelectedProjects(value);
    }
  };

  const handleApplyProjects = () => {
    setSelectedProjects(tempSelectedProjects);
    setIsProjectsOpen(false);
    refetch(); // Trigger the API call
  };

  const handleProjectsClose = () => {
    setTempSelectedProjects(selectedProjects); // Reset to previous selection
    setIsProjectsOpen(false);
  };

  if (isLoading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <CircularProgress />
    </Box>
  );

  if (error) return (
    <Container>
      <Alert severity="error">Error: {error.message}</Alert>
    </Container>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Engineering Productivity Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              label="Time Range"
            >
              {timeRanges.map((range) => (
                <MenuItem key={range.value} value={range.value}>
                  {range.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 300 }}>
            <InputLabel>Projects</InputLabel>
            <Select
              multiple
              open={isProjectsOpen}
              onOpen={() => setIsProjectsOpen(true)}
              onClose={handleProjectsClose}
              value={tempSelectedProjects}
              onChange={handleProjectChange}
              input={<OutlinedInput label="Projects" />}
              renderValue={(selected) => {
                if (selected.length === ALL_PROJECTS.length) {
                  return <Chip label="All Projects" />;
                }
                return (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} />
                    ))}
                  </Box>
                );
              }}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 300
                  }
                }
              }}
            >
              <MenuItem value="ALL">
                <Checkbox 
                  checked={tempSelectedProjects.length === ALL_PROJECTS.length}
                  indeterminate={tempSelectedProjects.length > 0 && tempSelectedProjects.length < ALL_PROJECTS.length}
                />
                <ListItemText primary="All Projects" />
              </MenuItem>
              <MenuItem disabled sx={{ opacity: 0.5 }}>
                Individual Projects
              </MenuItem>
              {ALL_PROJECTS.map((project) => (
                <MenuItem key={project} value={project}>
                  <Checkbox checked={tempSelectedProjects.includes(project)} />
                  <ListItemText primary={project} />
                </MenuItem>
              ))}
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', borderTop: 1, borderColor: 'divider' }}>
                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProjectsClose();
                  }} 
                  sx={{ mr: 1 }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApplyProjects();
                  }} 
                  variant="contained"
                >
                  Apply
                </Button>
              </Box>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 300 }}>
            <AssigneeSelect
              selectedAssignees={selectedAssignees}
              onAssigneesChange={setSelectedAssignees}
              projects={selectedProjects}
            />
          </FormControl>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <ExpandableBarGraph data={data?.engineers_data || {}} />
        </Grid>

        {/* Split View Container */}
        <Grid item xs={12}>
          <Paper sx={{ p: 0, display: 'flex', minHeight: 600 }}>
            {/* Left Section - Engineers List */}
            <Box sx={{ width: 300, borderRight: 1, borderColor: 'divider' }}>
              <List sx={{ p: 0 }}>
                <ListItem sx={{ bgcolor: 'grey.100' }}>
                  <Typography variant="h6">Team Members</Typography>
                </ListItem>
                <Divider />
                {Object.entries(data?.engineers_data || {}).map(([engineer, metrics]) => (
                  <ListItem key={engineer} disablePadding>
                    <ListItemButton 
                      selected={selectedEngineer === engineer}
                      onClick={() => setSelectedEngineer(engineer)}
                      sx={{
                        '&.Mui-selected': {
                          bgcolor: 'primary.light',
                          '&:hover': {
                            bgcolor: 'primary.light',
                          },
                        },
                      }}
                    >
                      <ListItemText 
                        primary={engineer}
                        secondary={`${Math.round(metrics.efficiency)}% Efficient`}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Box>

            {/* Right Section - Metrics and Insights */}
            <Box sx={{ flexGrow: 1, p: 3 }}>
              {selectedEngineer ? (
                <>
                  <Typography variant="h5" gutterBottom>
                    {selectedEngineer}'s Performance Insights
                  </Typography>
                  <MetricsCard 
                    metrics={data?.engineers_data[selectedEngineer]} 
                    expanded={true}
                  />
                </>
              ) : (
                <Box 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: 'text.secondary'
                  }}
                >
                  <Typography variant="h6">
                    Select an engineer to view their insights
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
} 