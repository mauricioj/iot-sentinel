import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './schemas/user.schema';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

@Injectable()
export class UsersService {
  private readonly BCRYPT_ROUNDS = 12;

  constructor(private readonly usersRepository: UsersRepository) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existing = await this.usersRepository.findByUsername(createUserDto.username);
    if (existing) { throw new ConflictException('Username already exists'); }
    const hashedPassword = await bcrypt.hash(createUserDto.password, this.BCRYPT_ROUNDS);
    return this.usersRepository.create({ ...createUserDto, password: hashedPassword });
  }

  async findAll(page: number, limit: number): Promise<PaginatedResponseDto<User>> {
    const { data, total } = await this.usersRepository.findAll(page, limit);
    return PaginatedResponseDto.create(data, total, page, limit);
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) { throw new NotFoundException('User not found'); }
    return user;
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findByUsername(username);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, this.BCRYPT_ROUNDS);
    }
    const user = await this.usersRepository.update(id, updateUserDto);
    if (!user) { throw new NotFoundException('User not found'); }
    return user;
  }

  async delete(id: string): Promise<void> {
    const user = await this.usersRepository.delete(id);
    if (!user) { throw new NotFoundException('User not found'); }
  }

  async validatePassword(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }
}
