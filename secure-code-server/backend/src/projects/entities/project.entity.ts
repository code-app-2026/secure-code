import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  // Store in bytes to format later
  @Column({ type: 'bigint', default: 0 })
  storageBytes: number;

  @Column({ default: 'Running' })
  status: string;

  @Column({ default: 1 })
  teamSize: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'text', array: true, default: [] })
  allowedCommands: string[];

  @Column({ type: 'text', array: true, default: [] })
  allowedFiles: string[];

  @Column({ type: 'jsonb', default: {} })
  memberRestrictions: Record<string, { allowedCommands: string[]; allowedFiles: string[] }>;

  @ManyToMany(() => User, (user) => user.projects)
  @JoinTable()
  users: User[];
}
