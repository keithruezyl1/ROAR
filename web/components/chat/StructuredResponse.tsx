'use client';

import * as React from 'react';

import { Button } from '@/components/shared/Button';
import { Textarea } from '@/components/shared/Textarea';
import type { DisputeType, IntakeReason, OrderDetails } from '@/types';

export interface StructuredResponseProps {
  question: string;
  caseId: string;
  disputeType: DisputeType;
  intakeReason: IntakeReason | null;
  orderDetails: OrderDetails | null;
  onSend: (content: string, metadata?: Record<string, unknown> | null) => void | Promise<void>;
  multiSelect?: boolean;
}

type QuestionType =
  | 'ISSUE_DETAILS'
  | 'Q_AFFECTED_SCOPE'
  | 'Q_REFUND_RECEIPT'
  | 'Q_REFUND_PAYMENT'
  | 'Q_REFUND_TIMING'
  | 'Q_DELIVERY_TRACKING'
  | 'Q_DELIVERY_SLA'
  | 'Q_DELIVERY_CARRIER'
  | 'Q_ITEM_SELECTION'
  | 'Q_AMOUNT_CONFIRM'
  | 'Q_ORDER_CONFIRM'
  | 'Q_TRACKING_CONFIRM'
  | 'Q_EDD_CONFIRM';

type StructuredConfig = {
  questionType: QuestionType;
  options: string[];
  multiSelect?: boolean;
};

const SHARED_OPTIONS: Record<Exclude<QuestionType, 'ISSUE_DETAILS' | 'Q_AFFECTED_SCOPE' | 'Q_ITEM_SELECTION' | 'Q_AMOUNT_CONFIRM' | 'Q_ORDER_CONFIRM' | 'Q_TRACKING_CONFIRM' | 'Q_EDD_CONFIRM'>, string[]> = {
  Q_REFUND_RECEIPT: [
    'Yes, I received everything but want a refund',
    'Yes, I received part of my order',
    'No, I received nothing',
    'Other',
  ],
  Q_REFUND_PAYMENT: [
    'Credit / Debit card',
    'PromptPay / Bank transfer',
    'Digital wallet (TrueMoney, GCash, Rabbit LINE Pay)',
    'Cash on delivery (COD)',
    'Other',
  ],
  Q_REFUND_TIMING: [
    'Within the last 7 days',
    '8 to 14 days ago',
    'More than 14 days ago',
    'Other',
  ],
  Q_DELIVERY_TRACKING: [
    'Still in transit / No updates',
    "Marked as delivered but I didn't receive it",
    "Delayed - tracking hasn't moved in days",
    'Other',
  ],
  Q_DELIVERY_SLA: [
    'Yes, by 1 to 3 days',
    'Yes, by more than 3 days',
    "No, it hasn't passed yet",
    'Other',
  ],
  Q_DELIVERY_CARRIER: [
    "Yes, they couldn't help",
    "Yes, they're investigating",
    "No, I haven't contacted them",
    'Other',
  ],
};

const ISSUE_DETAIL_OPTIONS: Partial<Record<IntakeReason, string[]>> = {
  non_receipt: [
    'I never received any delivery attempt',
    'The order appears unfulfilled',
    'Tracking never showed any real progress',
    'Other',
  ],
  delayed: [
    'Tracking shows delayed in transit',
    "It says delivered but I didn't receive it",
    'There have been no updates for several days',
    'Other',
  ],
  exception: [
    'Tracking shows an exception status',
    'Courier marked failed attempt',
    'Package appears stuck with no movement',
    'Other',
  ],
  lost: [
    'Tracking says lost parcel',
    'Carrier confirmed package cannot be found',
    'No updates and carrier suggested filing a claim',
    'Other',
  ],
  not_as_described: [
    'Product quality is below expectations',
    'Item specifications are incorrect',
    'Listing details do not match the product',
    'Other',
  ],
  wrong_item: [
    'It was a completely different item',
    'It was the wrong size, color, or variant',
    'I received an extra or unexpected item',
    'Other',
  ],
  damaged_goods: [
    'The item itself is damaged',
    'Only the packaging is damaged',
    'Both the item and packaging are damaged',
    'Other',
  ],
  partial_fulfillment: [
    'Items were missing from the package',
    'I received fewer units than ordered',
    'One package in a multi-package order never arrived',
    'Other',
  ],
  return_request: [
    'The item is unused and I want to return it',
    'I changed my mind about the purchase',
    'The item was opened but I still want to return it',
    'Other',
  ],
  changed_mind: [
    'I ordered by mistake',
    'I no longer need the item',
    'I found a better alternative',
    'Other',
  ],
  other: [
    'It is mainly a refund issue',
    'It is a return-related refund issue',
    'Other',
  ],
};

const AFFECTED_SCOPE_OPTIONS: string[] = [
  'All items are affected',
  'Only some items are affected',
  'Other',
];

function normalize(text: string) {
  return text.toLowerCase();
}

function containsAny(text: string, phrases: string[]) {
  return phrases.some((phrase) => text.includes(phrase));
}

function isItemSelectionQuestion(text: string) {
  return (
    containsAny(text, ['which items', 'what items']) ||
    (containsAny(text, ['which item', 'what item']) && containsAny(text, ['missing', 'damaged', 'wrong', 'affected', 'received'])) ||
    (containsAny(text, ['items']) && containsAny(text, ['missing', 'damaged', 'wrong', 'affected', 'received'])) ||
    (containsAny(text, ['item']) && containsAny(text, ['missing', 'damaged', 'wrong', 'affected', 'received']))
  );
}

function isScopeQuestion(text: string) {
  return (
    (
      containsAny(text, ['all items', 'entire order', 'whole order']) &&
      containsAny(text, ['some items', 'part of the order', 'only some'])
    ) ||
    containsAny(text, ['all or some']) ||
    containsAny(text, ['all items or only some']) ||
    containsAny(text, ['is it all items', 'is it only some items'])
  );
}

function matchQuestionType(question: string, disputeType: DisputeType, multiSelect?: boolean): QuestionType | null {
  const text = normalize(question);

  if (isScopeQuestion(text)) return 'Q_AFFECTED_SCOPE';
  if (
    containsAny(text, [
      'more detail',
      'what happened',
      'tell me more',
      'share a bit more',
      'what issue are you experiencing',
      'what issue are you having',
      'what type of problem are you experiencing',
      'what type of issue are you experiencing',
      'what type of damage occurred',
      'which best describes the damage',
      'item damaged packaging damaged or both',
      'describe the problem',
      'describe the issue',
    ])
  ) return 'ISSUE_DETAILS';
  if (isItemSelectionQuestion(text) && multiSelect) return 'Q_ITEM_SELECTION';
  if (containsAny(text, ['amount']) && containsAny(text, ['confirm', 'correct'])) return 'Q_AMOUNT_CONFIRM';
  if (containsAny(text, ['order']) && containsAny(text, ['referring to', 'the right order', 'confirm this order'])) return 'Q_ORDER_CONFIRM';

  if (containsAny(text, ['payment method', 'mode of payment', 'how did you pay', 'what payment method did you use'])) return 'Q_REFUND_PAYMENT';

  if (disputeType === 'refund') {
    if (containsAny(text, ['received any part', 'did any part arrive', 'received part of your order'])) return 'Q_REFUND_RECEIPT';
    if ((containsAny(text, ['order placed', 'when was']) && containsAny(text, ['order', 'purchase'])) || containsAny(text, ['how long ago'])) return 'Q_REFUND_TIMING';
  }

  if (disputeType === 'delivery') {
    if (containsAny(text, ['tracking status', 'tracking currently show', 'status does the tracking'])) return 'Q_DELIVERY_TRACKING';
    if (containsAny(text, ['estimated delivery']) && containsAny(text, ['passed', 'late', 'overdue'])) return 'Q_DELIVERY_SLA';
    if (containsAny(text, ['contacted the carrier', 'contacted the courier', 'reached out to the carrier'])) return 'Q_DELIVERY_CARRIER';
    if (containsAny(text, ['tracking']) && containsAny(text, ['consistent', 'match what you see'])) return 'Q_TRACKING_CONFIRM';
    if (containsAny(text, ['estimated delivery date']) && containsAny(text, ['confirm', 'correct'])) return 'Q_EDD_CONFIRM';
  }

  return null;
}

export function getStructuredConfig({
  question,
  disputeType,
  intakeReason,
  orderDetails,
  multiSelect,
}: Pick<StructuredResponseProps, 'question' | 'disputeType' | 'intakeReason' | 'orderDetails' | 'multiSelect'>): StructuredConfig | null {
  const questionType = matchQuestionType(question, disputeType, multiSelect);
  if (!questionType) return null;

  switch (questionType) {
    case 'ISSUE_DETAILS':
      if (!intakeReason) return null;
      {
        const options = ISSUE_DETAIL_OPTIONS[intakeReason] ?? [];
        if (options.length === 0) return null;
        return { questionType, options };
      }
    case 'Q_AFFECTED_SCOPE':
      return { questionType, options: AFFECTED_SCOPE_OPTIONS };
    case 'Q_ITEM_SELECTION': {
      const items = orderDetails?.items?.map((item) => item.item_name) ?? [];
      if (items.length === 0) return null;
      return { questionType, options: items, multiSelect: true };
    }
    case 'Q_AMOUNT_CONFIRM': {
      const amount = orderDetails?.transaction?.amount;
      if (typeof amount !== 'number') return null;
      return { questionType, options: [`Yes, THB ${amount.toFixed(2)}`, "No, it's a different amount"] };
    }
    case 'Q_ORDER_CONFIRM': {
      const createdAt = orderDetails?.created_at;
      if (!createdAt) return null;
      const orderDate = new Date(createdAt).toLocaleDateString('en-TH');
      return { questionType, options: [`Yes, that's the order (placed ${orderDate})`, "No, it's a different order"] };
    }
    case 'Q_TRACKING_CONFIRM': {
      if (!orderDetails?.shipment?.carrier || !orderDetails.shipment.status) return null;
      return {
        questionType,
        options: [
          `Yes, mine also shows ${orderDetails.shipment.status} with ${orderDetails.shipment.carrier}`,
          'No, mine shows something different',
        ],
      };
    }
    case 'Q_EDD_CONFIRM': {
      if (!orderDetails?.shipment?.estimated_delivery) return null;
      const edd = new Date(orderDetails.shipment.estimated_delivery).toLocaleDateString('en-TH');
      return { questionType, options: [`Yes, my estimated delivery was ${edd}`, 'No, I was given a different date'] };
    }
    default: {
      const options = SHARED_OPTIONS[questionType as keyof typeof SHARED_OPTIONS];
      return options ? { questionType, options } : null;
    }
  }
}

export function StructuredResponse({
  question,
  disputeType,
  intakeReason,
  orderDetails,
  onSend,
  multiSelect,
}: StructuredResponseProps) {
  const [selected, setSelected] = React.useState<string[]>([]);
  const [otherValue, setOtherValue] = React.useState('');
  const [sending, setSending] = React.useState(false);

  const config = React.useMemo(
    () => getStructuredConfig({ question, disputeType, intakeReason, orderDetails, multiSelect }),
    [disputeType, intakeReason, multiSelect, orderDetails, question]
  );

  React.useEffect(() => {
    setSelected([]);
    setOtherValue('');
  }, [question]);

  if (!config) return null;

  const otherSelected = selected.includes('Other');
  const optionToOrderItem = React.useMemo(() => {
    const pairs = (orderDetails?.items ?? []).map((item) => [item.item_name, item] as const);
    return new Map(pairs);
  }, [orderDetails]);

  const sendValue = async (value: string, metadata?: Record<string, unknown> | null) => {
    setSending(true);
    try {
      await onSend(value, metadata);
    } finally {
      setSending(false);
    }
  };

  const toggleSelection = async (option: string) => {
    if (!config.multiSelect) {
      setSelected([option]);
      if (option !== 'Other') {
        let metadata: Record<string, unknown> | null = null;
        if (config.questionType === 'Q_AFFECTED_SCOPE') {
          const normalizedOption = option.toLowerCase();
          metadata = {
            selection_type: 'affected_scope',
            scope: normalizedOption.includes('all items')
              ? 'all'
              : normalizedOption.includes('only some')
                ? 'partial'
                : normalizedOption.includes('not sure')
                  ? 'unsure'
                  : 'other',
          };
        }
        await sendValue(option, metadata);
      }
      return;
    }

    setSelected((current) => (
      current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option]
    ));
  };

  const confirmMultiSelect = async () => {
    const chosen = selected.filter((item) => item !== 'Other');
    if (chosen.length === 0) return;

    let prefix = 'Selected items';
    if (intakeReason === 'partial_fulfillment') prefix = 'Missing items';
    if (intakeReason === 'damaged_goods') prefix = 'Damaged items';
    if (intakeReason === 'wrong_item') prefix = 'Affected items';
    if (disputeType === 'delivery' && (intakeReason === 'delayed' || intakeReason === 'non_receipt')) prefix = 'Items not received';

    const selectedOrderItems = chosen
      .map((name) => optionToOrderItem.get(name))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    await sendValue(`${prefix}: ${chosen.join(', ')}`, {
      selection_type: 'affected_items',
      scope: 'partial',
      affected_item_ids: selectedOrderItems.map((item) => item.item_id),
      affected_item_names: selectedOrderItems.map((item) => item.item_name),
      affected_items: selectedOrderItems.map((item) => ({
        item_id: item.item_id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
    });
  };

  const submitOther = async () => {
    if (otherValue.trim().length === 0) return;
    await sendValue(otherValue.trim());
  };

  return (
    <div className="my-3 flex flex-col items-start gap-3">
      <div className="flex flex-wrap gap-2">
        {(config.questionType === 'Q_ITEM_SELECTION'
          ? config.options.filter((option) => option !== 'Other')
          : config.options
        ).map((option) => {
          const isSelected = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              disabled={sending}
              onClick={() => void toggleSelection(option)}
              className={isSelected
                ? 'flex items-center gap-1 rounded-pill bg-primary px-4 py-2 text-[13px] font-medium text-text-inverse transition-colors duration-instant'
                : 'rounded-pill border border-primary bg-primary/15 px-4 py-2 text-[13px] font-medium text-text-primary transition-colors duration-instant hover:bg-primary/25'
              }
            >
              {config.multiSelect && isSelected ? <span aria-hidden>+</span> : null}
              <span>{option}</span>
            </button>
          );
        })}
      </div>

      {otherSelected ? (
        <div className="w-full overflow-hidden transition-all duration-200 ease-out">
          <Textarea
            label="Please describe"
            value={otherValue}
            onChange={(event) => setOtherValue(event.target.value)}
            placeholder="Please describe..."
            rows={4}
          />
          <div className="mt-3 flex justify-end">
            <Button onClick={() => void submitOther()} disabled={sending || otherValue.trim().length === 0}>
              Send response
            </Button>
          </div>
        </div>
      ) : null}

      {config.multiSelect && selected.filter((item) => item !== 'Other').length > 0 ? (
        <div className="flex w-full justify-end">
          <Button onClick={() => void confirmMultiSelect()} disabled={sending}>
            Confirm selection
          </Button>
        </div>
      ) : null}
    </div>
  );
}


