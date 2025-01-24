import { useState, useEffect } from 'react';
import { 
  Autocomplete, 
  TextField, 
  Chip,
  CircularProgress 
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { searchAssignees } from '../services/api';

export default function AssigneeSelect({ 
  selectedAssignees, 
  onAssigneesChange,
  projects 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: assignees, isLoading } = useQuery({
    queryKey: ['assignees', searchTerm, projects],
    queryFn: () => searchAssignees(searchTerm, projects.join(',')),
    staleTime: 30000, // Cache results for 30 seconds
  });

  return (
    <Autocomplete
      multiple
      options={assignees || []}
      getOptionLabel={(option) => option.displayName}
      value={selectedAssignees}
      onChange={(_, newValue) => onAssigneesChange(newValue)}
      loading={isLoading}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Engineers"
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {isLoading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderTags={(value, getTagProps) =>
        value.map((option, index) => (
          <Chip
            label={option.displayName}
            {...getTagProps({ index })}
            key={option.accountId}
          />
        ))
      }
    />
  );
} 