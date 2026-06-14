import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

export const fetchSprints = createAsyncThunk('sprints/fetch', async (boardId, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/sprints/board/${boardId}`);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const createSprint = createAsyncThunk('sprints/create', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/sprints', payload);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const updateSprint = createAsyncThunk('sprints/update', async ({ id, ...updates }, { rejectWithValue }) => {
  try {
    const { data } = await api.put(`/sprints/${id}`, updates);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const startSprint = createAsyncThunk('sprints/start', async (id, { rejectWithValue }) => {
  try {
    const { data } = await api.post(`/sprints/${id}/start`);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const completeSprint = createAsyncThunk('sprints/complete', async ({ id, nextSprintId, comment }, { rejectWithValue }) => {
  try {
    const { data } = await api.post(`/sprints/${id}/complete`, { nextSprintId, comment });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const deleteSprint = createAsyncThunk('sprints/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/sprints/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const moveCardToSprint = createAsyncThunk('sprints/moveCard', async ({ cardId, targetSprintId, comment }, { rejectWithValue }) => {
  try {
    const { data } = await api.post(`/cards/${cardId}/move-sprint`, { targetSprintId, comment });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

const sprintSlice = createSlice({
  name: 'sprints',
  initialState: {
    sprints: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearSprints: (state) => {
      state.sprints = [];
      state.loading = false;
      state.error = null;
    },
    socketSprintCreated: (state, action) => {
      if (!state.sprints.find((s) => s._id === action.payload._id)) {
        state.sprints.push(action.payload);
      }
    },
    socketSprintUpdated: (state, action) => {
      const idx = state.sprints.findIndex((s) => s._id === action.payload._id);
      if (idx !== -1) state.sprints[idx] = action.payload;
    },
    socketSprintDeleted: (state, action) => {
      state.sprints = state.sprints.filter((s) => s._id !== action.payload.sprintId);
    },
    socketSprintCompleted: (state, action) => {
      const idx = state.sprints.findIndex((s) => s._id === action.payload.sprint._id);
      if (idx !== -1) state.sprints[idx] = action.payload.sprint;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSprints.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchSprints.fulfilled, (state, action) => { state.loading = false; state.sprints = action.payload; })
      .addCase(fetchSprints.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(createSprint.fulfilled, (state, action) => {
        if (!state.sprints.find((s) => s._id === action.payload._id)) {
          state.sprints.push(action.payload);
        }
      })
      .addCase(updateSprint.fulfilled, (state, action) => {
        const idx = state.sprints.findIndex((s) => s._id === action.payload._id);
        if (idx !== -1) state.sprints[idx] = action.payload;
      })
      .addCase(startSprint.fulfilled, (state, action) => {
        state.sprints = state.sprints.map((s) =>
          s._id === action.payload._id ? action.payload : s.status === 'active' ? { ...s, status: 'planning' } : s
        );
      })
      .addCase(completeSprint.fulfilled, (state, action) => {
        const idx = state.sprints.findIndex((s) => s._id === action.payload.sprint._id);
        if (idx !== -1) state.sprints[idx] = action.payload.sprint;
      })
      .addCase(deleteSprint.fulfilled, (state, action) => {
        state.sprints = state.sprints.filter((s) => s._id !== action.payload);
      });
  },
});

export const {
  clearSprints,
  socketSprintCreated,
  socketSprintUpdated,
  socketSprintDeleted,
  socketSprintCompleted,
} = sprintSlice.actions;

export default sprintSlice.reducer;
