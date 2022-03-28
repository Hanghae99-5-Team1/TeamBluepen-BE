import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/entity/user.entity';
import { ClassList } from '../entity/class.entity';
import { ClassListRepository } from '../repository/class.repository';
import { ClassDateRepository } from '../repository/classDate.repository';
import { StudentRepository } from '../repository/student.repository';
import * as uuid from 'uuid';
import { DateTime } from 'luxon';

@Injectable()
export class ClassService {
  constructor(
    @InjectRepository(ClassListRepository)
    private classlistRepository: ClassListRepository,
    @InjectRepository(ClassDateRepository)
    private classdateRepository: ClassDateRepository,
    @InjectRepository(StudentRepository)
    private studentRepository: StudentRepository,
  ) {}

  async findClassById(id: number): Promise<ClassList> {
    return await this.classlistRepository.findOne({ id });
  }

  async getClass(user: User): Promise<object> {
    const classlist = await this.classlistRepository
      .createQueryBuilder('C')
      .select([
        'C.id',
        'C.title',
        'C.time',
        'C.teacher',
        'C.imageUrl',
        'C.startDate',
        'C.endDate',
      ])
      .where('C.userid = :userid', { userid: user.id })
      .getMany();
    const mappingClasslist = classlist.map((data) => ({
      id: data.id,
      title: data.title,
      time: data.time.split('/').slice(0, -1),
      teacher: data.teacher,
      imageUrl: data.imageUrl,
      state: 'teach',
      progress:
        DateTime.fromISO(data.startDate) > DateTime.now()
          ? '시작전'
          : DateTime.fromISO(data.endDate) > DateTime.now()
          ? '진행중'
          : '종료',
    }));
    return mappingClasslist;
  }

  async getSelectedClass(Dto, id): Promise<object> {
    // const { year, month } = Dto;
    return await this.classlistRepository
      .createQueryBuilder('C')
      .select([
        'C.id',
        'C.title',
        'C.time',
        'C.teacher',
        'C.imageUrl',
        'C.createdAt',
      ])
      .leftJoinAndSelect('C.classdates', 'D')
      .where('C.id = :id', { id })
      .getOne();
  }

  async createClass(Dto, user: User): Promise<object> {
    const unique = uuid.v4();
    await this.classlistRepository.createClass(Dto, user, unique);
    const classlist = await this.classlistRepository.findOne({ uuid: unique });
    await this.classdateRepository.createClassDate(Dto, classlist);
    return { success: true, message: '클레스 생성 성공' };
  }

  async updateClass(Dto, id, user): Promise<object> {
    const { title, imageUrl } = Dto;
    const classlist = await this.classlistRepository.findOne({ id, user });
    classlist.title = title;
    if (imageUrl) {
      classlist.imageUrl = imageUrl;
    }
    await this.classlistRepository.save(classlist);
    return { success: true, message: '클레스 수정 성공' };
  }

  async deleteClass(id, user: User): Promise<object> {
    const result = await this.classlistRepository.delete({ id, user });
    if (result.affected === 0) {
      throw new NotFoundException('클레스 삭제 실패');
    }
    return { success: true, message: '클레스 삭제 성공' };
  }

  async getClassDate(id) {
    const classlist = await this.classlistRepository.findOne({ id });
    const classdate = await this.classdateRepository.find({ class: classlist });
    return classdate;
  }

  async getAllClassDateByUser(user, year, month) {
    const Alldate = await this.classdateRepository
      .createQueryBuilder('D')
      .select(['D.day', 'D.startTime', 'D.endTime', 'C.title'])
      .leftJoin('D.class', 'C')
      .leftJoin('C.students', 'S')
      .where('S.userid = :userid', { userid: user.id })
      .andWhere('D.year = :year', { year })
      .andWhere('D.month = :month', { month })
      .orderBy('D.day', 'ASC')
      .getMany();
    const mappingAlldate = Alldate.map((data) => ({
      day: data.day,
      startTime: data.startTime,
      endTime: data.endTime,
      title: data.class.title,
    }));
    return mappingAlldate;
  }

  async createClassDate(Dto, id, user: User) {
    const { times, startDate, endDate } = Dto;
    const classlist = await this.classlistRepository.findOne({ id, user });
    let time = '';
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    for (const weekday of times) {
      const { day, startTime, endTime } = weekday;
      time += `${days[day - 1]} ${startTime}~${endTime}/`;
    }
    classlist.startDate = startDate;
    classlist.endDate = endDate;
    classlist.time = time;
    return this.classdateRepository.createClassDate(Dto, classlist);
  }

  async updateClassDate(Dto, classid, classdateid, user) {
    const { year, month, day, startTime, endTime } = Dto;
    const classlist = await this.classlistRepository.findOne({
      id: classid,
      user,
    });
    const classdate = await this.classdateRepository.findOne({
      id: classdateid,
      class: classlist,
    });
    classdate.year = year;
    classdate.month = month;
    classdate.day = day;
    classdate.startTime = startTime;
    classdate.endTime = endTime;
    await this.classdateRepository.save(classdate);
    return { success: true, message: '클레스 달력 수정 성공' };
  }

  async deleteClassDate(classid, classdateid, user) {
    const classlist = await this.classlistRepository.findOne({
      id: classid,
      user,
    });
    const result = await this.classdateRepository.delete({
      id: classdateid,
      class: classlist,
    });
    if (result.affected === 0) {
      throw new NotFoundException('클레스 달력 삭제 실패');
    }
    return { success: true, message: '클레스 달력 삭제 성공' };
  }
  async deleteAllClassDate(classid, user) {
    const classlist = await this.classlistRepository.findOne({
      id: classid,
      user,
    });
    const result = await this.classdateRepository.delete({ class: classlist });
    if (result.affected === 0) {
      throw new NotFoundException('클레스 달력 삭제 실패');
    }
    return { success: true, message: '클레스 달력 전부 삭제 성공' };
  }

  async createStudent(id, user: User) {
    const classlist = await this.classlistRepository.findOne({ id });
    return this.studentRepository.createStudent(classlist, user);
  }

  async getUserInStudent(id) {
    const classlist = await this.classlistRepository.findOne({ id });
    return await this.studentRepository.find({ class: classlist });
  }

  async getClassInStudent(user: User) {
    const student = await this.classlistRepository
      .createQueryBuilder('C')
      .select([
        'C.id',
        'C.title',
        'C.teacher',
        'C.time',
        'C.imageUrl',
        'S.state',
        'C.startDate',
        'C.endDate',
      ])
      .leftJoin('C.students', 'S')
      .where('S.userid = :userid', { userid: user.id })
      .orderBy('S.state', 'ASC')
      .getMany();
    const mappingStudent = student.map((data) => ({
      id: data.id,
      title: data.title,
      teacher: data.teacher,
      time: data.time.split('/').slice(0, -1),
      imageUrl: data.imageUrl,
      state: data.students[0].state,
      progress:
        DateTime.fromISO(data.startDate) > DateTime.now()
          ? '시작전'
          : DateTime.fromISO(data.endDate) > DateTime.now()
          ? '진행중'
          : '종료',
    }));
    return mappingStudent;
  }

  async deleteStudent(id, user: User) {
    const result = await this.studentRepository.delete({ id, user });
    if (result.affected === 0) {
      throw new NotFoundException('수강 취소 실패');
    }
    return { success: true, message: '수강 취소 성공' };
  }
  async updateStudentState(Dto, studentid, classid, user) {
    const { isOk } = Dto;
    const classlist = await this.studentRepository.findOne({
      id: classid,
      user,
    });
    const studentlist = await this.studentRepository.findOne({
      id: studentid,
      class: classlist,
    });
    if (isOk == true) {
      studentlist.state = 'accepted';
    } else {
      studentlist.state = 'rejected';
    }
    await this.studentRepository.save(studentlist);
    return { success: true, message: '수강신청 처리성공' };
  }
}