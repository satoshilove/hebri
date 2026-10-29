import { findGroupOfPane, group, type LayoutNode, removePane, split } from './model'

/** Standing side chrome belongs outside the workspace, including its browser
 * tiles. Preserve the existing zone's collapsed state and other pane ratios. */
export function dockAtRightEdge(tree: LayoutNode, paneId: string): LayoutNode {
  const existing = findGroupOfPane(tree, paneId)

  if (
    tree.type === 'split' &&
    tree.orientation === 'row' &&
    tree.children.at(-1) === existing &&
    existing?.panes.length === 1
  ) {
    return tree
  }

  const rest = removePane(tree, paneId)

  if (!rest) {
    return tree
  }
  const zone = existing?.panes.length === 1 ? existing : group([paneId])

  return rest.type === 'split' && rest.orientation === 'row'
    ? { ...rest, children: [...rest.children, zone], weights: [...rest.weights, 1] }
    : split('row', [rest, zone], [4, 1])
}
