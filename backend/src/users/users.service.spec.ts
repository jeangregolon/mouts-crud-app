import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Repository, UpdateResult } from 'typeorm';
import { User } from './user.entity';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: Repository<User>;
  let cacheManager: any;

  const mockUser: User = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDeletedUser: User = {
    ...mockUser,
    name: 'Deleted User',
    email: 'deleted@example.com',
    deletedAt: new Date(),
  };

  const mockUpdateResult: UpdateResult = {
    affected: 1,
    raw: {},
    generatedMaps: [],
  };

  beforeEach(async () => {
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn().mockImplementation((dto) => ({
              ...dto,
              id: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
              deletedAt: null,
            })),
            save: jest.fn().mockImplementation((user) => Promise.resolve(user)),
            merge: jest.fn().mockImplementation((target, source) => ({ ...target, ...source })),
            softDelete: jest.fn().mockResolvedValue(mockUpdateResult),
            restore: jest.fn().mockResolvedValue(mockUpdateResult),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto: CreateUserDto = {
        name: 'Test User',
        email: 'test@example.com',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      const result = await service.create(createUserDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
        withDeleted: true,
      });
      expect(userRepository.create).toHaveBeenCalledWith(createUserDto);
      expect(userRepository.save).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalled();
      expect(cacheManager.del).toHaveBeenCalledWith('all_users');
      expect(result).toEqual(expect.objectContaining({
        id: expect.any(Number),
        name: createUserDto.name,
        email: createUserDto.email,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      }));
    });

    it('should throw ConflictException if email is already in use', async () => {
      const createUserDto: CreateUserDto = {
        name: 'Test User',
        email: 'test@example.com',
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
    });

    it('should restore and update a soft-deleted user with same email', async () => {
      const createUserDto: CreateUserDto = {
        name: 'Restored User',
        email: 'deleted@example.com',
      };

      const updatedUser = {
        ...mockDeletedUser,
        ...createUserDto,
        deletedAt: null,
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockDeletedUser);
      jest.spyOn(userRepository, 'save').mockResolvedValue(updatedUser);

      const result = await service.create(createUserDto);

      expect(userRepository.restore).toHaveBeenCalledWith(mockDeletedUser.id);
      expect(userRepository.save).toHaveBeenCalledWith({
        ...mockDeletedUser,
        ...createUserDto,
      });
      expect(result).toEqual(updatedUser);
    });
  });

  describe('findAll', () => {
    it('should return cached users if available', async () => {
      const cachedUsers = [mockUser];
      jest.spyOn(cacheManager, 'get').mockResolvedValue(cachedUsers);

      const result = await service.findAll();

      expect(cacheManager.get).toHaveBeenCalledWith('all_users');
      expect(userRepository.find).not.toHaveBeenCalled();
      expect(result).toEqual(cachedUsers);
    });

    it('should fetch from database and cache if not in cache', async () => {
      const users = [mockUser];
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(userRepository, 'find').mockResolvedValue(users);

      const result = await service.findAll();

      expect(cacheManager.get).toHaveBeenCalledWith('all_users');
      expect(userRepository.find).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalledWith(
        'all_users',
        users,
        300000,
      );
      expect(result).toEqual(users);
    });
  });

  describe('findOne', () => {
    it('should return cached user if available', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(mockUser);

      const result = await service.findOne(1);

      expect(cacheManager.get).toHaveBeenCalledWith('user_1');
      expect(userRepository.findOne).not.toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should fetch from database and cache if not in cache', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      const result = await service.findOne(1);

      expect(cacheManager.get).toHaveBeenCalledWith('user_1');
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(cacheManager.set).toHaveBeenCalledWith(
        'user_1',
        mockUser,
        300000,
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update an existing user', async () => {
      const updateUserDto: UpdateUserDto = { name: 'Updated User' };
      const updatedUser = { ...mockUser, ...updateUserDto };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(userRepository, 'save').mockResolvedValue(updatedUser);

      const result = await service.update(1, updateUserDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        withDeleted: true,
      });
      expect(cacheManager.del).toHaveBeenCalledWith('user_1');
      expect(cacheManager.del).toHaveBeenCalledWith('all_users');
      expect(userRepository.merge).toHaveBeenCalledWith(mockUser, updateUserDto);
      expect(userRepository.save).toHaveBeenCalledWith(updatedUser);
      expect(cacheManager.set).toHaveBeenCalledWith(
        'user_1',
        updatedUser,
        300000,
      );
      expect(result).toEqual(updatedUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      const updateUserDto: UpdateUserDto = { name: 'Updated User' };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(service.update(1, updateUserDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete an existing user', async () => {
      jest.spyOn(userRepository, 'softDelete').mockResolvedValue(mockUpdateResult);

      await service.remove(1);

      expect(cacheManager.del).toHaveBeenCalledWith('user_1');
      expect(cacheManager.del).toHaveBeenCalledWith('all_users');
      expect(userRepository.softDelete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(userRepository, 'softDelete').mockResolvedValue({ ...mockUpdateResult, affected: 0 });

      await expect(service.remove(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('cache methods', () => {
    it('should generate correct cache key', () => {
      const key = service['getUserCacheKey'](1);
      expect(key).toBe('user_1');
    });

    it('should clear user cache', async () => {
      await service['clearUserCache'](1);
      expect(cacheManager.del).toHaveBeenCalledWith('user_1');
      expect(cacheManager.del).toHaveBeenCalledWith('all_users');
    });

    it('should invalidate all users cache', async () => {
      await service['invalidateAllUsersCache']();
      expect(cacheManager.del).toHaveBeenCalledWith('all_users');
    });

    it('should cache user', async () => {
      await service['cacheUser'](mockUser);
      expect(cacheManager.set).toHaveBeenCalledWith(
        'user_1',
        mockUser,
        300000,
      );
    });
  });
});