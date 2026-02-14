/**
 * Утилиты для работы с изображениями без Firebase Storage
 * Используем Base64 для маленьких изображений (до 1MB) или внешние URL
 */

export const imageUtils = {
  /**
   * Конвертирует файл в Base64 строку
   */
  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  },

  /**
   * Проверяет размер файла (максимум 1MB для Base64 в Firestore)
   */
  validateFileSize(file: File, maxSizeMB: number = 1): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  },

  /**
   * Обрабатывает загрузку изображения для аватара
   * Возвращает Base64 строку или null если файл слишком большой
   */
  async processAvatarImage(file: File): Promise<string | null> {
    // Проверяем размер (максимум 500KB для аватаров)
    if (!this.validateFileSize(file, 0.5)) {
      throw new Error('Размер файла слишком большой. Максимум 500KB для аватара.');
    }

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      throw new Error('Файл должен быть изображением');
    }

    // Конвертируем в Base64
    return await this.fileToBase64(file);
  },

  /**
   * Создает URL для аватара на основе имени пользователя
   */
  generateAvatarUrl(name: string, background: string = '845ef7'): string {
    const encodedName = encodeURIComponent(name);
    return `https://ui-avatars.com/api/?name=${encodedName}&background=${background}&color=fff&size=200`;
  },
};

