import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

export const fetchBoard = createAsyncThunk('board/fetch', async (boardId, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/boards/${boardId}`);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const createList = createAsyncThunk('board/createList', async ({ title, boardId }, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/lists', { title, boardId });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const updateList = createAsyncThunk('board/updateList', async ({ id, title }, { rejectWithValue }) => {
  try {
    const { data } = await api.put(`/lists/${id}`, { title });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const deleteList = createAsyncThunk('board/deleteList', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/lists/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const createCard = createAsyncThunk('board/createCard', async ({ title, listId, boardId }, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/cards', { title, listId, boardId });
    return { card: data, listId };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const updateCard = createAsyncThunk('board/updateCard', async ({ id, ...updates }, { rejectWithValue }) => {
  try {
    const { data } = await api.put(`/cards/${id}`, updates);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const moveCard = createAsyncThunk('board/moveCard', async ({ id, listId, position }, { rejectWithValue }) => {
  try {
    await api.patch(`/cards/${id}/move`, { listId, position });
    return { id, listId, position };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const deleteCard = createAsyncThunk('board/deleteCard', async ({ id, listId }, { rejectWithValue }) => {
  try {
    await api.delete(`/cards/${id}`);
    return { id, listId };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const updateBoardDetails = createAsyncThunk('board/update', async ({ id, ...updates }, { rejectWithValue }) => {
  try {
    const { data } = await api.put(`/boards/${id}`, updates);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

const boardSlice = createSlice({
  name: 'board',
  initialState: {
    board: null,
    lists: [],
    loading: false,
    error: null,
    activeCard: null,
    onlineUsers: [],
  },
  reducers: {
    clearBoard: (state) => {
      state.board = null;
      state.lists = [];
      state.loading = false;
      state.error = null;
      state.onlineUsers = [];
    },
    setActiveCard: (state, action) => {
      state.activeCard = action.payload;
    },
    // Real-time socket handlers
    socketListCreated: (state, action) => {
      const { list } = action.payload;
      if (!state.lists.find((l) => l._id === list._id)) {
        state.lists.push({ ...list, cards: list.cards || [] });
      }
    },
    socketListUpdated: (state, action) => {
      const { list } = action.payload;
      const idx = state.lists.findIndex((l) => l._id === list._id);
      if (idx !== -1) {
        state.lists[idx] = { ...state.lists[idx], ...list };
      }
    },
    socketListDeleted: (state, action) => {
      const { listId } = action.payload;
      state.lists = state.lists.filter((l) => l._id !== listId);
    },
    socketListReordered: (state, action) => {
      const { listOrders } = action.payload;
      listOrders.forEach(({ id, position }) => {
        const list = state.lists.find((l) => l._id === id);
        if (list) list.position = position;
      });
      state.lists.sort((a, b) => a.position - b.position);
    },
    socketCardCreated: (state, action) => {
      const { card, listId } = action.payload;
      const list = state.lists.find((l) => l._id === listId);
      if (list && !list.cards.find((c) => c._id === card._id)) {
        list.cards.push(card);
      }
    },
    socketCardUpdated: (state, action) => {
      const { card } = action.payload;
      for (const list of state.lists) {
        const idx = list.cards.findIndex((c) => c._id === card._id);
        if (idx !== -1) {
          list.cards[idx] = card;
          break;
        }
      }
      if (state.activeCard?._id === card._id) {
        state.activeCard = card;
      }
    },
    socketCardMoved: (state, action) => {
      const { cardId, fromListId, toListId, position } = action.payload;
      const fromList = state.lists.find((l) => l._id === fromListId);
      const toList = state.lists.find((l) => l._id === toListId);
      if (!fromList || !toList) return;

      const cardIdx = fromList.cards.findIndex((c) => c._id === cardId);
      if (cardIdx === -1) return;

      const [card] = fromList.cards.splice(cardIdx, 1);
      card.list = toListId;
      card.position = position;
      toList.cards.push(card);
      toList.cards.sort((a, b) => a.position - b.position);
    },
    socketCardDeleted: (state, action) => {
      const { cardId, listId } = action.payload;
      const list = state.lists.find((l) => l._id === listId);
      if (list) {
        list.cards = list.cards.filter((c) => c._id !== cardId);
      }
      if (state.activeCard?._id === cardId) state.activeCard = null;
    },
    socketBoardUpdated: (state, action) => {
      const { board } = action.payload;
      if (state.board?._id === board._id) {
        state.board = { ...state.board, ...board };
      }
    },
    socketUserJoined: (state, action) => {
      const { user } = action.payload;
      if (!state.onlineUsers.find((u) => u._id === user._id)) {
        state.onlineUsers.push(user);
      }
    },
    socketUserLeft: (state, action) => {
      const { userId } = action.payload;
      state.onlineUsers = state.onlineUsers.filter((u) => u._id !== userId);
    },
    // Optimistic DnD update
    moveCardOptimistic: (state, action) => {
      const { cardId, fromListId, toListId, newIndex } = action.payload;
      const fromList = state.lists.find((l) => l._id === fromListId);
      const toList = state.lists.find((l) => l._id === toListId);
      if (!fromList || !toList) return;

      const cardIdx = fromList.cards.findIndex((c) => c._id === cardId);
      if (cardIdx === -1) return;

      const [card] = fromList.cards.splice(cardIdx, 1);
      toList.cards.splice(newIndex, 0, card);

      // Recalculate positions
      toList.cards.forEach((c, i) => { c.position = i * 1000; });
      if (fromListId !== toListId) {
        fromList.cards.forEach((c, i) => { c.position = i * 1000; });
      }
    },
    reorderListsOptimistic: (state, action) => {
      const { activeId, overId } = action.payload;
      const activeIdx = state.lists.findIndex((l) => l._id === activeId);
      const overIdx = state.lists.findIndex((l) => l._id === overId);
      if (activeIdx === -1 || overIdx === -1) return;
      const [removed] = state.lists.splice(activeIdx, 1);
      state.lists.splice(overIdx, 0, removed);
      state.lists.forEach((l, i) => { l.position = i * 1000; });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBoard.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchBoard.fulfilled, (state, action) => {
        state.loading = false;
        state.board = action.payload.board;
        state.lists = action.payload.lists;
      })
      .addCase(fetchBoard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createList.fulfilled, (state, action) => {
        if (!state.lists.find((l) => l._id === action.payload._id)) {
          state.lists.push({ ...action.payload, cards: [] });
        }
      })
      .addCase(updateList.fulfilled, (state, action) => {
        const idx = state.lists.findIndex((l) => l._id === action.payload._id);
        if (idx !== -1) state.lists[idx] = { ...state.lists[idx], ...action.payload };
      })
      .addCase(deleteList.fulfilled, (state, action) => {
        state.lists = state.lists.filter((l) => l._id !== action.payload);
      })
      .addCase(createCard.fulfilled, (state, action) => {
        const { card, listId } = action.payload;
        const list = state.lists.find((l) => l._id === listId);
        if (list && !list.cards.find((c) => c._id === card._id)) {
          list.cards.push(card);
        }
      })
      .addCase(updateCard.fulfilled, (state, action) => {
        const card = action.payload;
        for (const list of state.lists) {
          const idx = list.cards.findIndex((c) => c._id === card._id);
          if (idx !== -1) { list.cards[idx] = card; break; }
        }
        if (state.activeCard?._id === card._id) state.activeCard = card;
      })
      .addCase(deleteCard.fulfilled, (state, action) => {
        const { id, listId } = action.payload;
        const list = state.lists.find((l) => l._id === listId);
        if (list) list.cards = list.cards.filter((c) => c._id !== id);
        if (state.activeCard?._id === id) state.activeCard = null;
      })
      .addCase(updateBoardDetails.fulfilled, (state, action) => {
        state.board = { ...state.board, ...action.payload };
      });
  },
});

export const {
  clearBoard,
  setActiveCard,
  socketListCreated,
  socketListUpdated,
  socketListDeleted,
  socketListReordered,
  socketCardCreated,
  socketCardUpdated,
  socketCardMoved,
  socketCardDeleted,
  socketBoardUpdated,
  socketUserJoined,
  socketUserLeft,
  moveCardOptimistic,
  reorderListsOptimistic,
} = boardSlice.actions;

export default boardSlice.reducer;
