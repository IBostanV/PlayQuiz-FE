// Values are the backend's KnowledgeBaseRecordStatus names, sent as-is when saving a record.
export enum KnowledgeBaseStatusEnum {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  HIDDEN = 'HIDDEN',
  INTERNAL = 'INTERNAL',
}

// What the admin picker shows. Only ACTIVE appears in the public knowledge base.
export const KNOWLEDGE_BASE_STATUSES: { value: KnowledgeBaseStatusEnum; label: string; hint: string }[] = [
  { value: KnowledgeBaseStatusEnum.DRAFT, label: 'Draft', hint: 'Still being written. Not shown to readers.' },
  { value: KnowledgeBaseStatusEnum.ACTIVE, label: 'Active', hint: 'Published: shown in the Wiki.' },
  { value: KnowledgeBaseStatusEnum.PENDING, label: 'Pending review', hint: 'Waiting for review. Not shown to readers.' },
  { value: KnowledgeBaseStatusEnum.HIDDEN, label: 'Hidden', hint: 'Taken down but kept. Not shown to readers.' },
  { value: KnowledgeBaseStatusEnum.INTERNAL, label: 'Internal', hint: 'For the team only. Not shown to readers.' },
];
