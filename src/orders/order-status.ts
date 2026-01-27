export enum OrderStatus {
  Placed = 'Placed',
  Preparing = 'Preparing',
  Ready = 'Ready',
  PickedUp = 'PickedUp',
  Cancelled = 'Cancelled',
  Abandoned = 'Abandoned',
}

export const ACTIVE_STATUSES = [
  OrderStatus.Placed,
  OrderStatus.Preparing,
  OrderStatus.Ready,
];
