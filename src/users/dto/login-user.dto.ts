import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { UserRole } from '../schemas/user.schema';

export class LoginUserDto {
    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @IsNotEmpty()
    password: string;

    @IsEnum(UserRole)
    role: UserRole;
}
