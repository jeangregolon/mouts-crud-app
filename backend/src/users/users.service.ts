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
  private readonly USER_CACHE_TTL = process.env.REDIS_TTL ? Number(process.env.REDIS_TTL) : 5 * 60 * 1000;
  private readonly ALL_USERS_KEY = process.env.ALL_USERS_KEY || 'all_users';
  private readonly USER_KEY_PREFIX = process.env.USER_KEY_PREFIX || 'user_';

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
        const updatedUser = await this.usersRepository.save({
          ...existingUser,
          ...createUserDto
        });
        
        await this.cacheUser(updatedUser);
        await this.invalidateAllUsersCache();
        
        return updatedUser;
      }
      throw new ConflictException('Email already in use');
    }

    const user = this.usersRepository.create(createUserDto);
    const newUser = await this.usersRepository.save(user);
    
    await this.cacheUser(newUser);
    await this.invalidateAllUsersCache();
    
    return newUser;
  }

  async findAll(): Promise<User[]> {
    const cachedUsers = await this.cacheManager.get<User[]>(this.ALL_USERS_KEY);
    if (cachedUsers) return cachedUsers;

    const users = await this.usersRepository.find();
    
    await this.cacheManager.set(this.ALL_USERS_KEY, users, this.USER_CACHE_TTL);
    
    return users;
  }

  async findOne(id: number): Promise<User> {
    const cacheKey = this.getUserCacheKey(id);
    
    const cachedUser = await this.cacheManager.get<User>(cacheKey);
    if (cachedUser) return cachedUser;

    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);

    await this.cacheUser(user);
    
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({ 
      where: { id },
      withDeleted: true
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.clearUserCache(id);
    
    const updatedUser = this.usersRepository.merge(existingUser, updateUserDto);
    const result = await this.usersRepository.save(updatedUser);
    
    await this.cacheUser(result);
    
    return result;
  }

  async remove(id: number): Promise<void> {
    await this.clearUserCache(id);
    
    const result = await this.usersRepository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  private getUserCacheKey(id: number): string {
    return `${this.USER_KEY_PREFIX}${id}`;
  }

  private async cacheUser(user: User): Promise<void> {
    const cacheKey = this.getUserCacheKey(user.id);
    await this.cacheManager.set(cacheKey, user, this.USER_CACHE_TTL * 1000);
  }

  private async clearUserCache(id: number): Promise<void> {
    const userKey = this.getUserCacheKey(id);
    await Promise.all([
      this.cacheManager.del(userKey),
      this.invalidateAllUsersCache()
    ]);
  }

  private async invalidateAllUsersCache(): Promise<void> {
    await this.cacheManager.del(this.ALL_USERS_KEY);
  }
}