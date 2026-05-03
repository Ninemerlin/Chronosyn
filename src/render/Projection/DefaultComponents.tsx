
interface DefaultComponentProps {
  id: string;
}
export function DefaultComponent({id}:DefaultComponentProps) {
  return (
    <div>
      <div>DefaultComponent</div>
      <div>ID: {id}</div>
    </div>
  )
}

export function LoadingComponent() {
  return (
    <div>
      <div>Loading...</div>
    </div>
  )
}
