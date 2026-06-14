import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import workspaceReducer from './slices/workspaceSlice';
import boardReducer from './slices/boardSlice';
import notificationReducer from './slices/notificationSlice';
import sprintReducer from './slices/sprintSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    workspaces: workspaceReducer,
    board: boardReducer,
    notifications: notificationReducer,
    sprints: sprintReducer,
  },
});
