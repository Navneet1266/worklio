import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  DndContext, PointerSensor, useSensor, useSensors, pointerWithin,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import api from '../../api/axios';
import { moveCardOptimistic, reorderListsOptimistic } from '../../store/slices/boardSlice';
import List from './List';
import AddList from './AddList';

export default function Board({ boardId, searchQuery = '', filterPriority = [], filterType = [], filterAssignee = [] }) {
  const dispatch = useDispatch();
  const { lists } = useSelector(s => s.board);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const getCardInfo = useCallback(cardId => {
    for (const list of lists) {
      const card = list.cards.find(c => c._id === cardId);
      if (card) return { card, listId: list._id };
    }
    return null;
  }, [lists]);

  const handleDragEnd = useCallback(async event => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeType = active.data.current?.type;

    if (activeType === 'list') {
      dispatch(reorderListsOptimistic({ activeId: active.id, overId: over.id }));
      const updated = lists.slice();
      const ai = updated.findIndex(l => l._id === active.id);
      const oi = updated.findIndex(l => l._id === over.id);
      const [removed] = updated.splice(ai, 1);
      updated.splice(oi, 0, removed);
      api.patch(`/boards/${boardId}/reorder-lists`, {
        listOrders: updated.map((l, i) => ({ id: l._id, position: i * 1000 })),
      }).catch(console.error);
      return;
    }

    if (activeType === 'card') {
      const cardInfo = getCardInfo(active.id);
      if (!cardInfo) return;
      const overData = over.data.current;
      let toListId, newIndex;
      if (overData?.type === 'list') {
        toListId = over.id;
        newIndex = lists.find(l => l._id === toListId)?.cards.length ?? 0;
      } else if (overData?.type === 'card') {
        toListId = overData.listId;
        newIndex = lists.find(l => l._id === toListId)?.cards.findIndex(c => c._id === over.id) ?? 0;
      } else return;

      dispatch(moveCardOptimistic({ cardId: active.id, fromListId: cardInfo.listId, toListId, newIndex }));
      api.patch(`/cards/${active.id}/move`, { listId: toListId, position: (newIndex + 1) * 1000 }).catch(console.error);
    }
  }, [lists, boardId, dispatch, getCardInfo]);

  const sortedLists = lists.slice().sort((a, b) => a.position - b.position);

  // Apply filters client-side
  const filteredLists = sortedLists.map(list => ({
    ...list,
    cards: list.cards.filter(card => {
      if (searchQuery && !card.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterPriority.length && !filterPriority.includes(card.priority)) return false;
      if (filterType.length && !filterType.includes(card.cardType)) return false;
      if (filterAssignee.length && !card.assignees?.some(a => filterAssignee.includes(a._id))) return false;
      return true;
    }),
  }));

  const listIds = sortedLists.map(l => l._id);

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
      <div className="board-scroll">
        <SortableContext items={listIds} strategy={horizontalListSortingStrategy}>
          {filteredLists.map(list => (
            <List key={list._id} list={list} boardId={boardId} />
          ))}
        </SortableContext>
        <AddList boardId={boardId} />
      </div>
    </DndContext>
  );
}
