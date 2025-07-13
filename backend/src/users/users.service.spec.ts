import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Repository } from 'typeorm';
import { Cache } from 'cache-manager';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: Repository<User>;
  let cacheManager: Cache;

  const mockUser: User = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null
  };

  const mockDeletedUser = {
    ...mockUser,
    deletedAt: new Date()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            preload: jest.fn(),
            restore: jest.fn(),
            softDelete: jest.fn()
          }
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn()
          }
        }
      ]
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    cacheManager = module.get<Cache>(CACHE_MANAGER);
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto: CreateUserDto = {
        name: 'New User',
        email: 'new@example.com'
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(userRepository, 'create').mockReturnValue(mockUser);
      jest.spyOn(userRepository, 'save').mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);
      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
        withDeleted: true
      });
      expect(userRepository.create).toHaveBeenCalledWith(createUserDto);
    });

    it('should throw ConflictException for existing active user', async () => {
      const createUserDto: CreateUserDto = {
        name: 'Test User',
        email: 'test@example.com'
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return cached users if available', async () => {
      const cachedUsers = [mockUser];
      jest.spyOn(cacheManager, 'get').mockResolvedValue(cachedUsers);

      const result = await service.findAll();
      expect(result).toEqual(cachedUsers);
      expect(cacheManager.get).toHaveBeenCalledWith('all_users');
    });

    it('should fetch from database and cache when no cache', async () => {
      const users = [mockUser];
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(userRepository, 'find').mockResolvedValue(users);
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      const result = await service.findAll();
      expect(result).toEqual(users);
      expect(userRepository.find).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalledWith('all_users', users, 600000);
    });
  });

  describe('findOne', () => {
    it('should return cached user if available', async () => {
      const cacheKey = `user_${mockUser.id}`;
      jest.spyOn(cacheManager, 'get').mockResolvedValue(mockUser);

      const result = await service.findOne(mockUser.id);
      expect(result).toEqual(mockUser);
      expect(cacheManager.get).toHaveBeenCalledWith(cacheKey);
    });

    it('should fetch from database, cache and return user', async () => {
      const cacheKey = `user_${mockUser.id}`;
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      const result = await service.findOne(mockUser.id);
      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: mockUser.id } });
      expect(cacheManager.set).toHaveBeenCalledWith(cacheKey, mockUser, 600000);
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      name: 'Updated Name'
    };

    it('should update user and clear cache', async () => {
      const updatedUser = { ...mockUser, ...updateUserDto };
      jest.spyOn(cacheManager, 'del').mockResolvedValue(true);
      jest.spyOn(userRepository, 'preload').mockResolvedValue(updatedUser);
      jest.spyOn(userRepository, 'save').mockResolvedValue(updatedUser);

      const result = await service.update(mockUser.id, updateUserDto);
      expect(result).toEqual(updatedUser);
      expect(cacheManager.del).toHaveBeenCalledWith(`user_${mockUser.id}`);
      expect(cacheManager.del).toHaveBeenCalledWith('all_users');
      expect(userRepository.preload).toHaveBeenCalledWith({
        id: mockUser.id,
        ...updateUserDto
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(userRepository, 'preload').mockResolvedValue(undefined);

      await expect(service.update(999, updateUserDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete user and clear cache', async () => {
      jest.spyOn(cacheManager, 'del').mockResolvedValue(true);
      jest.spyOn(userRepository, 'softDelete').mockResolvedValue({ affected: 1 } as any);

      await service.remove(mockUser.id);
      expect(cacheManager.del).toHaveBeenCalledWith(`user_${mockUser.id}`);
      expect(cacheManager.del).toHaveBeenCalledWith('all_users');
      expect(userRepository.softDelete).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(userRepository, 'softDelete').mockResolvedValue({ affected: 0 } as any);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});