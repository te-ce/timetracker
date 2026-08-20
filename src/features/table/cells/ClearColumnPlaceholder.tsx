export function ClearColumnPlaceholder({ visible }: { visible: boolean }) {
  if (!visible) return null
  return <td className="w-8 border-l border-gray-200 dark:border-gray-700"></td>
}
