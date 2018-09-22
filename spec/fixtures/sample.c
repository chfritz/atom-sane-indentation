#include <stdbool.h>
#include "runtime/subtree.h"
#include "runtime/tree.h"
#include "runtime/language.h"

typedef struct {
  Subtree parent;
  const TSTree *tree;
  Length position;
  uint32_t child_index;
  uint32_t structural_child_index;
  const TSSymbol *alias_sequence;
} ChildIterator;

TSNode ts_node_new(const TSTree *tree, const Subtree *subtree, Length position, TSSymbol alias) {
  return (TSNode) {
    {position.bytes, position.extent.row, position.extent.column, alias},
    subtree,
    tree,
  };
}

static inline TSNode ts_node__null() {
  return ts_node_new(NULL, NULL, length_zero(), 0);
}

uint32_t ts_node_start_byte(TSNode self) {
  return self.context[0];
}

// ChildIterator
static inline ChildIterator ts_node_iterate_children(const TSNode *node) {
  Subtree subtree = ts_node__subtree(*node);
  if (ts_subtree_child_count(subtree) == 0) {
    return (ChildIterator) {NULL_SUBTREE, node->tree, length_zero(), 0, 0, NULL};
  }
  const TSSymbol *alias_sequence = ts_language_alias_sequence(
    node->tree->language,
    subtree.ptr->alias_sequence_id
  );
  return (ChildIterator) {
    .tree = node->tree,
    .parent = subtree,
    .alias_sequence = alias_sequence,
  };
}

static inline bool ts_node_child_iterator_next(ChildIterator *self, TSNode *result) {
  if (!self->parent.ptr || self->child_index == self->parent.ptr->child_count) return false;
  const Subtree *child = &self->parent.ptr->children[self->child_index];
  TSSymbol alias_symbol = 0;
  if (!ts_subtree_extra(*child)) {
    if (self->alias_sequence) {
      alias_symbol = self->alias_sequence[self->structural_child_index];
    }
    self->structural_child_index++;
  }
  if (self->child_index > 0) {
    self->position = length_add(self->position, ts_subtree_padding(*child));
  }
  *result = ts_node_new(
    self->tree,
    child,
    self->position,
    alias_symbol
  );
  self->position = length_add(self->position, ts_subtree_size(*child));
  self->child_index++;
  return true;
}

static inline bool ts_node__is_relevant(TSNode self, bool include_anonymous) {
  Subtree tree = ts_node__subtree(self);
  if (include_anonymous) {
    return ts_subtree_visible(tree) || ts_node__alias(&self);
  } else {
    return
      (ts_subtree_visible(tree) &&
        ts_subtree_named(tree)) ||
        (ts_node__alias(&self) &&
          ts_language_symbol_metadata(self.tree->language, ts_node__alias(&self)).named);
  }
}

static inline TSNode ts_node__child(TSNode self, uint32_t child_index, bool include_anonymous) {
  TSNode result = self;
  bool did_descend = true;

  while (did_descend) {
    did_descend = false;

    TSNode child;
    uint32_t index = 0;
    ChildIterator iterator = ts_node_iterate_children(&result);
    while (ts_node_child_iterator_next(&iterator, &child)) {
      if (ts_node__is_relevant(child, include_anonymous)) {
        if (index == child_index) {
          ts_tree_set_cached_parent(self.tree, &child, &self);
          return child;
        }
        index++;
      } else {
        uint32_t grandchild_index = child_index - index;
        uint32_t grandchild_count = ts_node__relevant_child_count(child, include_anonymous);
        if (grandchild_index < grandchild_count) {
          did_descend = true;
          result = child;
          child_index = grandchild_index;
          break;
        }
        index += grandchild_count;
      }
    }
  }

  return ts_node__null();
}


void test() {
  if (found_child_containing_target) {
    if (!ts_node_is_null(earlier_child)) {
      earlier_node = earlier_child;
      earlier_node_is_relevant = earlier_child_is_relevant;
    }
    node = child;
  } else if (earlier_child_is_relevant) {
    return earlier_child;
  } else if (!ts_node_is_null(earlier_child)) {
    node = earlier_child;
  } else if (earlier_node_is_relevant) {
    return earlier_node;
  } else {
    node = earlier_node;
  }
}
