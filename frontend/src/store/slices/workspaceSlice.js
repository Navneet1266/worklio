import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

export const fetchWorkspaces = createAsyncThunk('workspaces/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/workspaces');
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const createWorkspace = createAsyncThunk('workspaces/create', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/workspaces', payload);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const updateWorkspace = createAsyncThunk('workspaces/update', async ({ id, ...payload }, { rejectWithValue }) => {
  try {
    const { data } = await api.put(`/workspaces/${id}`, payload);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const deleteWorkspace = createAsyncThunk('workspaces/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/workspaces/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const addMember = createAsyncThunk('workspaces/addMember', async ({ workspaceId, email, role }, { rejectWithValue }) => {
  try {
    const { data } = await api.post(`/workspaces/${workspaceId}/members`, { email, role });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const removeMember = createAsyncThunk('workspaces/removeMember', async ({ workspaceId, userId }, { rejectWithValue }) => {
  try {
    await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
    return { workspaceId, userId };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const fetchWorkspaceBoards = createAsyncThunk('workspaces/fetchBoards', async (workspaceId, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/workspaces/${workspaceId}/boards`);
    return { workspaceId, boards: data };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const createBoard = createAsyncThunk('workspaces/createBoard', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/boards', payload);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const starBoard = createAsyncThunk('workspaces/starBoard', async ({ boardId, userId }, { rejectWithValue }) => {
  try {
    const { data } = await api.post(`/boards/${boardId}/star`);
    return { boardId, isNowStarred: data.starred, userId };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

const workspaceSlice = createSlice({
  name: 'workspaces',
  initialState: {
    list: [],
    boards: {},
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkspaces.pending, (state) => { state.loading = true; })
      .addCase(fetchWorkspaces.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchWorkspaces.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createWorkspace.fulfilled, (state, action) => {
        state.list.push(action.payload);
      })
      .addCase(updateWorkspace.fulfilled, (state, action) => {
        const idx = state.list.findIndex((w) => w._id === action.payload._id);
        if (idx !== -1) state.list[idx] = action.payload;
      })
      .addCase(deleteWorkspace.fulfilled, (state, action) => {
        state.list = state.list.filter((w) => w._id !== action.payload);
      })
      .addCase(addMember.fulfilled, (state, action) => {
        const idx = state.list.findIndex((w) => w._id === action.payload._id);
        if (idx !== -1) state.list[idx] = action.payload;
      })
      .addCase(removeMember.fulfilled, (state, action) => {
        const ws = state.list.find((w) => w._id === action.payload.workspaceId);
        if (ws) {
          ws.members = ws.members.filter((m) => m.user._id !== action.payload.userId);
        }
      })
      .addCase(fetchWorkspaceBoards.fulfilled, (state, action) => {
        state.boards[action.payload.workspaceId] = action.payload.boards;
      })
      .addCase(createBoard.fulfilled, (state, action) => {
        const board = action.payload;
        const existing = state.boards[board.workspace];
        if (existing) existing.push(board);
        else state.boards[board.workspace] = [board];
      })
      .addCase(starBoard.fulfilled, (state, action) => {
        const { boardId, isNowStarred, userId } = action.payload;
        Object.values(state.boards).forEach(list => {
          const board = list?.find(b => b._id === boardId);
          if (!board) return;
          if (!board.starred) board.starred = [];
          if (isNowStarred) {
            if (!board.starred.includes(userId)) board.starred.push(userId);
          } else {
            board.starred = board.starred.filter(id => id !== userId);
          }
        });
      });
  },
});

export const { clearError } = workspaceSlice.actions;
export default workspaceSlice.reducer;
