/**
 * Order State Machine using XState
 * Manages order lifecycle and valid state transitions
 */

import { createMachine, assign } from 'xstate';
import { OrderStatus } from '@prisma/client';

export interface OrderContext {
  orderId: string;
  status: OrderStatus;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export type OrderEvent =
  | { type: 'SUBMIT' }
  | { type: 'PAYMENT_INITIATED' }
  | { type: 'PAYMENT_SUCCEEDED' }
  | { type: 'PAYMENT_FAILED'; error: string }
  | { type: 'CONFIRM' }
  | { type: 'START_PROCESSING' }
  | { type: 'SHIP' }
  | { type: 'DELIVER' }
  | { type: 'COMPLETE' }
  | { type: 'CANCEL'; reason?: string }
  | { type: 'REFUND' }
  | { type: 'FAIL'; error: string };

/**
 * Order State Machine
 *
 * State Flow:
 * DRAFT → PENDING → PAYMENT_PENDING → PAID → CONFIRMED →
 * PROCESSING → SHIPPED → DELIVERED → COMPLETED
 *
 * Cancellation paths:
 * Any state (except DELIVERED/COMPLETED) → CANCELLED
 * PAID/CONFIRMED → REFUNDED
 */
export const orderMachine = createMachine({
  id: 'order',
  initial: 'draft',
  context: {
    orderId: '',
    status: OrderStatus.DRAFT,
  } as OrderContext,
  states: {
    // Initial state - cart not yet submitted
    draft: {
      on: {
        SUBMIT: {
          target: 'pending',
          actions: assign({
            status: () => OrderStatus.PENDING,
          }),
        },
        CANCEL: {
          target: 'cancelled',
          actions: assign({
            status: () => OrderStatus.CANCELLED,
          }),
        },
      },
    },

    // Order created, awaiting payment
    pending: {
      on: {
        PAYMENT_INITIATED: {
          target: 'paymentPending',
          actions: assign({
            status: () => OrderStatus.PAYMENT_PENDING,
          }),
        },
        CANCEL: {
          target: 'cancelled',
          actions: assign({
            status: () => OrderStatus.CANCELLED,
          }),
        },
      },
    },

    // Payment being processed
    paymentPending: {
      on: {
        PAYMENT_SUCCEEDED: {
          target: 'paid',
          actions: assign({
            status: () => OrderStatus.PAID,
          }),
        },
        PAYMENT_FAILED: {
          target: 'failed',
          actions: assign({
            status: () => OrderStatus.FAILED,
            errorMessage: ({ event }) => event.error,
          }),
        },
        CANCEL: {
          target: 'cancelled',
          actions: assign({
            status: () => OrderStatus.CANCELLED,
          }),
        },
      },
    },

    // Payment confirmed
    paid: {
      on: {
        CONFIRM: {
          target: 'confirmed',
          actions: assign({
            status: () => OrderStatus.CONFIRMED,
          }),
        },
        REFUND: {
          target: 'refunded',
          actions: assign({
            status: () => OrderStatus.REFUNDED,
          }),
        },
        CANCEL: {
          target: 'cancelled',
          actions: assign({
            status: () => OrderStatus.CANCELLED,
          }),
        },
      },
    },

    // Order confirmed, ready for processing
    confirmed: {
      on: {
        START_PROCESSING: {
          target: 'processing',
          actions: assign({
            status: () => OrderStatus.PROCESSING,
          }),
        },
        REFUND: {
          target: 'refunded',
          actions: assign({
            status: () => OrderStatus.REFUNDED,
          }),
        },
        CANCEL: {
          target: 'cancelled',
          actions: assign({
            status: () => OrderStatus.CANCELLED,
          }),
        },
      },
    },

    // Being prepared/packed
    processing: {
      on: {
        SHIP: {
          target: 'shipped',
          actions: assign({
            status: () => OrderStatus.SHIPPED,
          }),
        },
        CANCEL: {
          target: 'cancelled',
          actions: assign({
            status: () => OrderStatus.CANCELLED,
          }),
        },
      },
    },

    // Shipped to customer
    shipped: {
      on: {
        DELIVER: {
          target: 'delivered',
          actions: assign({
            status: () => OrderStatus.DELIVERED,
          }),
        },
      },
    },

    // Delivered to customer
    delivered: {
      on: {
        COMPLETE: {
          target: 'completed',
          actions: assign({
            status: () => OrderStatus.COMPLETED,
          }),
        },
        REFUND: {
          target: 'refunded',
          actions: assign({
            status: () => OrderStatus.REFUNDED,
          }),
        },
      },
    },

    // Order completed (final state)
    completed: {
      type: 'final',
    },

    // Order cancelled (final state)
    cancelled: {
      type: 'final',
    },

    // Payment refunded (final state)
    refunded: {
      type: 'final',
    },

    // Order failed (final state)
    failed: {
      type: 'final',
    },
  },
}, {
  actions: {
    // You can define custom actions here
  },
});

/**
 * Get valid transitions from a given status
 */
export function getValidTransitions(currentStatus: OrderStatus): OrderStatus[] {
  const statusToState: Record<OrderStatus, string> = {
    [OrderStatus.DRAFT]: 'draft',
    [OrderStatus.PENDING]: 'pending',
    [OrderStatus.PAYMENT_PENDING]: 'paymentPending',
    [OrderStatus.PAID]: 'paid',
    [OrderStatus.CONFIRMED]: 'confirmed',
    [OrderStatus.PROCESSING]: 'processing',
    [OrderStatus.SHIPPED]: 'shipped',
    [OrderStatus.DELIVERED]: 'delivered',
    [OrderStatus.COMPLETED]: 'completed',
    [OrderStatus.CANCELLED]: 'cancelled',
    [OrderStatus.REFUNDED]: 'refunded',
    [OrderStatus.FAILED]: 'failed',
  };

  const currentState = statusToState[currentStatus];
  const transitions: OrderStatus[] = [];

  // Get available transitions from state machine
  const state = orderMachine.transition(currentState, { type: 'CHECK' });

  // Map transitions back to OrderStatus
  if (currentStatus === OrderStatus.DRAFT) {
    transitions.push(OrderStatus.PENDING, OrderStatus.CANCELLED);
  } else if (currentStatus === OrderStatus.PENDING) {
    transitions.push(OrderStatus.PAYMENT_PENDING, OrderStatus.CANCELLED);
  } else if (currentStatus === OrderStatus.PAYMENT_PENDING) {
    transitions.push(OrderStatus.PAID, OrderStatus.FAILED, OrderStatus.CANCELLED);
  } else if (currentStatus === OrderStatus.PAID) {
    transitions.push(OrderStatus.CONFIRMED, OrderStatus.REFUNDED, OrderStatus.CANCELLED);
  } else if (currentStatus === OrderStatus.CONFIRMED) {
    transitions.push(OrderStatus.PROCESSING, OrderStatus.REFUNDED, OrderStatus.CANCELLED);
  } else if (currentStatus === OrderStatus.PROCESSING) {
    transitions.push(OrderStatus.SHIPPED, OrderStatus.CANCELLED);
  } else if (currentStatus === OrderStatus.SHIPPED) {
    transitions.push(OrderStatus.DELIVERED);
  } else if (currentStatus === OrderStatus.DELIVERED) {
    transitions.push(OrderStatus.COMPLETED, OrderStatus.REFUNDED);
  }

  return transitions;
}

/**
 * Check if a status transition is valid
 */
export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  const validTransitions = getValidTransitions(from);
  return validTransitions.includes(to);
}

/**
 * Get the event type for a status transition
 */
export function getEventForTransition(from: OrderStatus, to: OrderStatus): string | null {
  if (!isValidTransition(from, to)) {
    return null;
  }

  const transitionMap: Record<string, string> = {
    [`${OrderStatus.DRAFT}-${OrderStatus.PENDING}`]: 'SUBMIT',
    [`${OrderStatus.PENDING}-${OrderStatus.PAYMENT_PENDING}`]: 'PAYMENT_INITIATED',
    [`${OrderStatus.PAYMENT_PENDING}-${OrderStatus.PAID}`]: 'PAYMENT_SUCCEEDED',
    [`${OrderStatus.PAYMENT_PENDING}-${OrderStatus.FAILED}`]: 'PAYMENT_FAILED',
    [`${OrderStatus.PAID}-${OrderStatus.CONFIRMED}`]: 'CONFIRM',
    [`${OrderStatus.CONFIRMED}-${OrderStatus.PROCESSING}`]: 'START_PROCESSING',
    [`${OrderStatus.PROCESSING}-${OrderStatus.SHIPPED}`]: 'SHIP',
    [`${OrderStatus.SHIPPED}-${OrderStatus.DELIVERED}`]: 'DELIVER',
    [`${OrderStatus.DELIVERED}-${OrderStatus.COMPLETED}`]: 'COMPLETE',
  };

  // Handle cancellation and refund
  if (to === OrderStatus.CANCELLED) {
    return 'CANCEL';
  }
  if (to === OrderStatus.REFUNDED) {
    return 'REFUND';
  }

  return transitionMap[`${from}-${to}`] || null;
}
