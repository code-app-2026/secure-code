import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
} from 'typeorm';
import { Role } from '../enums/role.enum';
import { Status } from '../enums/status.enum';
import { Project } from '../../projects/entities/project.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  passwordHash: string;

  @Column({ type: 'int', default: 8 })
  passwordLength: number;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.Viewer,
  })
  role: Role;

  @Column({
    type: 'enum',
    enum: Status,
    default: Status.Active,
  })
  status: Status;

  @Column({ nullable: true })
  allowIp: string;

  @Column({ nullable: true, type: 'text' })
  publicKey: string;

  @Column({ type: 'varchar', nullable: true })
  backupCode: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastActive: Date;

  @Column({ default: false })
  isOnline: boolean;

  @Column({ type: 'varchar', nullable: true })
  sessionId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'int', default: 0 })
  failedLoginAttempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  lockoutUntil: Date | null;

  @ManyToMany(() => Project, (project) => project.users)
  projects: Project[];
}
