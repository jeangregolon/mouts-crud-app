import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
      withDeleted: true
    });

    if (existingUser) {
      if (existingUser.deletedAt) {
        await this.usersRepository.restore(existingUser.id);
        return this.usersRepository.save({
          ...existingUser,
          ...createUserDto
        });
      }
      throw new ConflictException('Email already in use');
    }

    const user = this.usersRepository.create(createUserDto);
    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    const cachedUsers = await this.cacheManager.get<User[]>('all_users');
    if (cachedUsers) return cachedUsers;

    const users = await this.usersRepository.find();
    await this.cacheManager.set('all_users', users, 60 * 1000 * 10);
    return users;
  }

  async findOne(id: number): Promise<User> {
    const cacheKey = `user_${id}`;
    const cachedUser = await this.cacheManager.get<User>(cacheKey);
    if (cachedUser) return cachedUser;

    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);

    await this.cacheManager.set(cacheKey, user, 60 * 1000 * 10);
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    await this.cacheManager.del(`user_${id}`);
    await this.cacheManager.del('all_users');

    const user = await this.usersRepository.preload({
      id,
      ...updateUserDto
    });

    if (!user) throw new NotFoundException(`User with ID ${id} not found`);

    return this.usersRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    await this.cacheManager.del(`user_${id}`);
    await this.cacheManager.del('all_users');

    const result = await this.usersRepository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }
}