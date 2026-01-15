import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface NubanResponse {
  status: boolean;
  message: string;
  data?: {
    account_number: string;
    account_name: string;
    bank_code: string;
  };
}

@Injectable()
export class NubanService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://app.nuban.com.ng/api';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('NUBAN_API_KEY') || '';
  }

  async verifyAccountNumber(
    bankCode: string,
    accountNumber: string,
  ): Promise<{ accountName: string }> {
    if (!this.apiKey) {
      throw new HttpException(
        'NUBAN API key not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      const url = `${this.baseUrl}/${this.apiKey}?bank_code=${bankCode}&acc_no=${accountNumber}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new HttpException(
          'Failed to verify account number',
          HttpStatus.BAD_REQUEST,
        );
      }

      const data: NubanResponse = await response.json();

      if (!data.status || !data.data) {
        throw new HttpException(
          data.message || 'Invalid account number',
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        accountName: data.data.account_name,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Error verifying account number',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
