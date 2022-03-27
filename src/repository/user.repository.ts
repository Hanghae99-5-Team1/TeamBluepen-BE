import {
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { EntityRepository, Repository } from 'typeorm';
import { User } from '../entity/user.entity';
import * as bcrypt from 'bcryptjs';

@EntityRepository(User)
export class UserRepository extends Repository<User> {
  async createUser(
    userEmail,
    userName,
    provider?: string,
    password?: string,
    VerifyToken?: string,
  ): Promise<number> {
    let hashedPassword;
    if (password) {
      const salt = await bcrypt.genSalt();
      hashedPassword = await bcrypt.hash(password, salt);
    }
    const user = this.create({
      userEmail,
      userName,
      provider,
      password: hashedPassword,
      currentHashedRefreshToken: VerifyToken,
    });
    try {
      await this.save(user);
      const theUser = this.findOne({ userName, userEmail });
      return theUser['id'];
    } catch (error) {
      console.log(error);
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('존재하는 이메일');
      } else {
        throw new InternalServerErrorException();
      }
    }
  }
}