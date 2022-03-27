import { User } from 'src/entity/user.entity';
import { Board } from './board.entity';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Comment extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  description: string;

  @Column()
  writer: string;

  @Column({ nullable: true })
  userId: number;

  @Column({ nullable: true })
  boardId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne((type) => User, (user) => user.comments, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne((type) => Board, (board) => board.comments, {
    onDelete: 'CASCADE',
  })
  board: Board;
}