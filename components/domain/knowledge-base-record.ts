import { KnowledgeBaseStatusEnum } from '../enums/knowledge-base-status-enum';

export class KnowledgeBaseRecord {
  public categoryId: number;
  public content: string;
  public tags: string;
  public title: string;
  public visible: boolean;
  public status: KnowledgeBaseStatusEnum;

  constructor(categoryId: number,
    content: string,
    tags: string,
    title: string,
    visible: boolean,
    status: KnowledgeBaseStatusEnum) {
    this.categoryId = categoryId;
    this.content = content;
    this.tags = tags;
    this.title = title;
    this.visible = visible;
    this.status = status;
  }
}
