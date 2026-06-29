import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from './entities/setting.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SystemSetting)
    private settingsRepository: Repository<SystemSetting>,
  ) {}

  async getAllSettings() {
    const settings = await this.settingsRepository.find();
    // Convert to a simple object
    const result: Record<string, any> = {};
    settings.forEach((s) => {
      result[s.key] = s.value;
    });
    return result;
  }

  async getSetting(key: string, defaultValue: any = null) {
    const setting = await this.settingsRepository.findOne({ where: { key } });
    if (setting) return setting.value;
    return defaultValue;
  }

  async updateSetting(key: string, value: any, description?: string) {
    let setting = await this.settingsRepository.findOne({ where: { key } });
    if (!setting) {
      setting = this.settingsRepository.create({ key, value, description });
    } else {
      setting.value = value;
      if (description !== undefined) {
        setting.description = description;
      }
    }
    await this.settingsRepository.save(setting);
    return setting;
  }

  async updateMultiple(updates: Record<string, any>) {
    for (const [key, value] of Object.entries(updates)) {
      await this.updateSetting(key, value);
    }
    return this.getAllSettings();
  }
}
