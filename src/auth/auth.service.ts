import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { LoginUserDto } from '../users/dto/login-user.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';

@Injectable()
export class AuthService {
    constructor(private usersService: UsersService) { }

    async signup(createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }

    async login(loginUserDto: LoginUserDto) {
        const user = await this.usersService.findOne(loginUserDto.username);
        if (!user || user.password !== loginUserDto.password) {
            throw new UnauthorizedException('Invalid credentials');
        }
        if (user.role !== loginUserDto.role) {
            throw new UnauthorizedException('Invalid role for this user');
        }
        // In a real app, generate JWT here. For now, return user info.
        const { password, ...result } = user.toObject();
        return result;
    }
}
