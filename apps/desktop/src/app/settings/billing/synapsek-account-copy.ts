import type { Locale } from '@/i18n'

type Copy = {
  title: string
  introduction: string
  preview: string
  credits: string
  working: string
  signIn: string
  signOut: string
  refresh: string
  manage: string
  remove: string
  removeNotice: string
  error: string
}

export const accountCopy: Record<Locale, Copy> = {
  en: {
    title: 'Synapsek account',
    introduction:
      'Use your existing Synapsek account and subscription. Signing in does not upload local chats or files.',
    preview:
      'Synapsek-funded model usage and team workspace access are not enabled in this account preview. Your current model provider remains separate.',
    credits: 'Included monthly credits',
    working: 'Working…',
    signIn: 'Sign in with Synapsek',
    signOut: 'Sign out',
    refresh: 'Refresh account',
    manage: 'Manage on Synapsek',
    remove: 'Remove local session only',
    removeNotice: 'Removing the local session does not revoke it on the server.',
    error:
      'The account operation could not finish. Unlock your operating system credential store and retry. If sign-out fails, retry it when the service is available.'
  },
  de: {
    title: 'Synapsek-Konto',
    introduction:
      'Verwende dein bestehendes Synapsek-Konto und Abonnement. Die Anmeldung lädt keine lokalen Chats oder Dateien hoch.',
    preview:
      'Von Synapsek finanzierte Modellnutzung und Team-Arbeitsbereiche sind in dieser Vorschau nicht aktiviert. Dein bisheriger Modellanbieter bleibt separat.',
    credits: 'Enthaltene monatliche Credits',
    working: 'Wird bearbeitet…',
    signIn: 'Mit Synapsek anmelden',
    signOut: 'Abmelden',
    refresh: 'Konto aktualisieren',
    manage: 'Auf Synapsek verwalten',
    remove: 'Nur lokale Sitzung entfernen',
    removeNotice: 'Das Entfernen der lokalen Sitzung widerruft sie nicht auf dem Server.',
    error:
      'Der Vorgang konnte nicht abgeschlossen werden. Entsperre den Anmeldedatenspeicher deines Betriebssystems und versuche es erneut. Falls die Abmeldung fehlschlägt, wiederhole sie, sobald der Dienst verfügbar ist.'
  },
  es: {
    title: 'Cuenta de Synapsek',
    introduction: 'Usa tu cuenta y suscripción actuales de Synapsek. Iniciar sesión no sube chats ni archivos locales.',
    preview:
      'El uso de modelos con créditos de Synapsek y los espacios de equipo no están habilitados en esta vista previa. Tu proveedor de modelos actual sigue siendo independiente.',
    credits: 'Créditos mensuales incluidos',
    working: 'Procesando…',
    signIn: 'Iniciar sesión con Synapsek',
    signOut: 'Cerrar sesión',
    refresh: 'Actualizar cuenta',
    manage: 'Gestionar en Synapsek',
    remove: 'Eliminar solo la sesión local',
    removeNotice: 'Eliminar la sesión local no la revoca en el servidor.',
    error:
      'No se pudo completar la operación. Desbloquea el almacén de credenciales del sistema y vuelve a intentarlo. Si falla el cierre de sesión, repítelo cuando el servicio esté disponible.'
  },
  fr: {
    title: 'Compte Synapsek',
    introduction:
      'Utilisez votre compte et votre abonnement Synapsek existants. La connexion ne téléverse pas vos conversations ou fichiers locaux.',
    preview:
      'L’utilisation de modèles financée par Synapsek et les espaces d’équipe ne sont pas activés dans cet aperçu. Votre fournisseur de modèles actuel reste distinct.',
    credits: 'Crédits mensuels inclus',
    working: 'Traitement…',
    signIn: 'Se connecter avec Synapsek',
    signOut: 'Se déconnecter',
    refresh: 'Actualiser le compte',
    manage: 'Gérer sur Synapsek',
    remove: 'Supprimer uniquement la session locale',
    removeNotice: 'Supprimer la session locale ne la révoque pas sur le serveur.',
    error:
      'L’opération n’a pas pu aboutir. Déverrouillez le stockage des identifiants du système et réessayez. Si la déconnexion échoue, réessayez lorsque le service est disponible.'
  },
  ja: {
    title: 'Synapsek アカウント',
    introduction:
      '既存の Synapsek アカウントとサブスクリプションを使用します。サインインしてもローカルのチャットやファイルはアップロードされません。',
    preview:
      'このプレビューでは Synapsek のクレジットによるモデル利用とチームワークスペースは有効になっていません。現在のモデルプロバイダーは別のままです。',
    credits: '毎月含まれるクレジット',
    working: '処理中…',
    signIn: 'Synapsek でサインイン',
    signOut: 'サインアウト',
    refresh: 'アカウントを更新',
    manage: 'Synapsek で管理',
    remove: 'ローカルセッションのみ削除',
    removeNotice: 'ローカルセッションを削除してもサーバー側では失効しません。',
    error:
      '操作を完了できませんでした。OS の認証情報ストアを解除して再試行してください。サインアウトに失敗した場合はサービスの復旧後に再試行してください。'
  },
  ru: {
    title: 'Аккаунт Synapsek',
    introduction: 'Используйте существующий аккаунт и подписку Synapsek. Вход не загружает локальные чаты и файлы.',
    preview:
      'Использование моделей за счёт Synapsek и командные пространства в этой версии не включены. Текущий поставщик моделей остаётся отдельным.',
    credits: 'Включённые ежемесячные кредиты',
    working: 'Обработка…',
    signIn: 'Войти через Synapsek',
    signOut: 'Выйти',
    refresh: 'Обновить аккаунт',
    manage: 'Управлять в Synapsek',
    remove: 'Удалить только локальную сессию',
    removeNotice: 'Удаление локальной сессии не отзывает её на сервере.',
    error:
      'Не удалось завершить операцию. Разблокируйте хранилище учётных данных системы и повторите попытку. Если выход не удался, повторите его после восстановления сервиса.'
  },
  ar: {
    title: 'حساب Synapsek',
    introduction: 'استخدم حسابك واشتراكك الحاليين في Synapsek. تسجيل الدخول لا يرفع المحادثات أو الملفات المحلية.',
    preview:
      'استخدام النماذج برصيد Synapsek ومساحات عمل الفريق غير مفعّلين في هذه المعاينة. يظل مزود النماذج الحالي منفصلاً.',
    credits: 'الأرصدة الشهرية المشمولة',
    working: 'جارٍ التنفيذ…',
    signIn: 'تسجيل الدخول باستخدام Synapsek',
    signOut: 'تسجيل الخروج',
    refresh: 'تحديث الحساب',
    manage: 'الإدارة في Synapsek',
    remove: 'إزالة الجلسة المحلية فقط',
    removeNotice: 'إزالة الجلسة المحلية لا تلغيها على الخادم.',
    error:
      'تعذّر إكمال العملية. افتح مخزن بيانات الاعتماد في نظام التشغيل وحاول مجددًا. إذا فشل تسجيل الخروج، أعد المحاولة عند توفر الخدمة.'
  },
  zh: {
    title: 'Synapsek 账户',
    introduction: '使用现有的 Synapsek 账户和订阅。登录不会上传本地聊天或文件。',
    preview: '此账户预览尚未启用 Synapsek 付费模型使用或团队工作区访问。当前模型提供商仍然独立。',
    credits: '每月包含的积分',
    working: '处理中…',
    signIn: '使用 Synapsek 登录',
    signOut: '退出登录',
    refresh: '刷新账户',
    manage: '在 Synapsek 管理',
    remove: '仅移除本地会话',
    removeNotice: '移除本地会话不会撤销服务器上的会话。',
    error: '无法完成操作。请解锁操作系统凭据存储后重试。如果退出登录失败，请在服务恢复后重试。'
  },
  'zh-hant': {
    title: 'Synapsek 帳戶',
    introduction: '使用現有的 Synapsek 帳戶和訂閱。登入不會上傳本機聊天或檔案。',
    preview: '此帳戶預覽尚未啟用 Synapsek 付費模型使用或團隊工作區存取。目前的模型供應商仍然獨立。',
    credits: '每月包含的點數',
    working: '處理中…',
    signIn: '使用 Synapsek 登入',
    signOut: '登出',
    refresh: '重新整理帳戶',
    manage: '在 Synapsek 管理',
    remove: '僅移除本機工作階段',
    removeNotice: '移除本機工作階段不會撤銷伺服器上的工作階段。',
    error: '無法完成操作。請解鎖作業系統憑證儲存區後重試。如果登出失敗，請在服務恢復後重試。'
  }
}
