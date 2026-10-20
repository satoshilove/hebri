import type { Locale } from '@/i18n'

type UsageCopy = { enabled: string; remaining: string; held: string; purchased: string; tokens: string; debt: string }
export const usageCopy: Record<Locale, UsageCopy> = {
  en: {
    enabled:
      'Choose Synapsek in the model picker to use your shared website and desktop credits. Each model call, including tool follow-ups, uses this balance. Restart Hebri after switching accounts.',
    remaining: 'Included credits remaining',
    held: 'Credits reserved',
    purchased: 'Purchased credits available',
    tokens: 'Tokens this month',
    debt: 'Credit adjustment due'
  },
  de: {
    enabled:
      'Wähle Synapsek im Modellmenü, um gemeinsame Web- und Desktop-Credits zu nutzen. Jeder Modellaufruf, auch nach Tools, nutzt dieses Guthaben. Starte Hebri nach einem Kontowechsel neu.',
    remaining: 'Verbleibende enthaltene Credits',
    held: 'Reservierte Credits',
    purchased: 'Verfügbare gekaufte Credits',
    tokens: 'Tokens diesen Monat',
    debt: 'Ausstehende Credit-Korrektur'
  },
  es: {
    enabled:
      'Elige Synapsek en el selector de modelos para compartir créditos entre web y escritorio. Cada llamada, incluidos los pasos con herramientas, consume este saldo. Reinicia Hebri al cambiar de cuenta.',
    remaining: 'Créditos incluidos restantes',
    held: 'Créditos reservados',
    purchased: 'Créditos comprados disponibles',
    tokens: 'Tokens este mes',
    debt: 'Ajuste de créditos pendiente'
  },
  fr: {
    enabled:
      'Choisissez Synapsek dans le sélecteur de modèles pour partager vos crédits web et bureau. Chaque appel, y compris après un outil, utilise ce solde. Redémarrez Hebri après un changement de compte.',
    remaining: 'Crédits inclus restants',
    held: 'Crédits réservés',
    purchased: 'Crédits achetés disponibles',
    tokens: 'Tokens ce mois-ci',
    debt: 'Ajustement de crédits dû'
  },
  ja: {
    enabled:
      'モデル選択で Synapsek を選ぶと、ウェブとデスクトップでクレジットを共有します。ツール使用後を含む各モデル呼び出しが残高を使用します。アカウント変更後は Hebri を再起動してください。',
    remaining: 'プラン内クレジット残高',
    held: '予約済みクレジット',
    purchased: '購入クレジット残高',
    tokens: '今月のトークン',
    debt: '未精算クレジット'
  },
  ru: {
    enabled:
      'Выберите Synapsek в списке моделей для общего баланса сайта и приложения. Каждый вызов, включая шаги после инструментов, расходует кредиты. Перезапустите Hebri после смены аккаунта.',
    remaining: 'Остаток включённых кредитов',
    held: 'Зарезервировано кредитов',
    purchased: 'Доступные купленные кредиты',
    tokens: 'Токены за месяц',
    debt: 'Корректировка кредитов к оплате'
  },
  ar: {
    enabled:
      'اختر Synapsek من قائمة النماذج لاستخدام الرصيد المشترك بين الموقع والتطبيق. كل استدعاء، بما في ذلك المتابعة بعد الأدوات، يستخدم الرصيد. أعد تشغيل Hebri بعد تغيير الحساب.',
    remaining: 'الرصيد المتبقي ضمن الخطة',
    held: 'الرصيد المحجوز',
    purchased: 'الرصيد المشترى المتاح',
    tokens: 'الرموز هذا الشهر',
    debt: 'تسوية الرصيد المستحقة'
  },
  zh: {
    enabled:
      '在模型选择器中选择 Synapsek，即可共享网站和桌面端积分。每次模型调用（包括工具后续步骤）都会使用此余额。切换账户后请重启 Hebri。',
    remaining: '套餐积分余额',
    held: '已预留积分',
    purchased: '可用购买积分',
    tokens: '本月令牌数',
    debt: '待结算积分'
  },
  'zh-hant': {
    enabled:
      '在模型選擇器中選擇 Synapsek，即可共用網站和桌面端點數。每次模型呼叫（包括工具後續步驟）都會使用此餘額。切換帳戶後請重新啟動 Hebri。',
    remaining: '方案點數餘額',
    held: '已預留點數',
    purchased: '可用購買點數',
    tokens: '本月權杖數',
    debt: '待結算點數'
  }
}
