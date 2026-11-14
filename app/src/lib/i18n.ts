// Idiomas: espanol e ingles. Por defecto sigue el idioma de Windows; se puede fijar en Ajustes.
import { createContext, useContext } from 'react'

export type Lang = 'es' | 'en'
export type LangPref = 'auto' | Lang

const es = {
  'tab.inicio': 'Inicio', 'tab.conectados': 'Conectados', 'tab.accesos': 'Accesos', 'tab.ajustes': 'Ajustes',
  'tabs.label': 'Secciones', 'activity': 'Actividad',
  'title.about': 'Acerca de', 'title.minimize': 'Minimizar', 'title.close': 'Cerrar',
  'err.generic': 'No se pudo completar. El detalle quedó en el registro técnico.',
  'cancel': 'Cancelar', 'close': 'Cerrar', 'send': 'Enviar', 'loading': 'Cargando…',

  'home.checking': 'Revisando el equipo…',
  'home.fixing': 'Arreglando…',
  'home.fixingSub': 'Las personas conectadas se desconectarán unos segundos y podrán volver a entrar.',
  'step.check': 'Revisando el equipo', 'step.search': 'Buscando la solución', 'step.backup': 'Guardando una copia de seguridad',
  'step.apply': 'Aplicando la solución', 'step.verify': 'Comprobando que funciona',
  'home.ok': 'Todo funciona bien', 'home.broken': 'Ahora solo puede entrar una persona',
  'home.notInstalled': 'MUD Control aún no está instalado en este equipo',
  'home.notInstalledSub': 'Pide a tu especialista que haga la instalación.',
  'home.brokenSub': 'Windows se actualizó y desactivó las conexiones múltiples. Se arregla con un clic.',
  'home.okSub': '{n} {people} ahora · pueden entrar hasta {max} a la vez',
  'people.connected.one': 'persona conectada', 'people.connected.many': 'personas conectadas',
  'people.one': 'persona', 'people.many': 'personas',
  'home.fix': 'Arreglar ahora', 'home.check': 'Comprobar', 'home.checked': 'Comprobado',
  'home.fixed': 'Listo: ya pueden entrar varias personas otra vez',
  'home.notFixed': 'No se pudo arreglar todavía. Se volverá a intentar solo.',
  'tile.connected': 'Conectados', 'tile.connectedSub': '{n} {people} ahora',
  'tile.access': 'Accesos', 'tile.accessSub.one': '1 persona puede entrar', 'tile.accessSub.many': '{n} personas pueden entrar',
  'tile.notify': 'Avisar a todos', 'tile.notifySub': 'Enviar un mensaje',
  'tile.backups': 'Copias de seguridad', 'tile.backupsSub': 'La última es de {when}', 'tile.backupsNone': 'Aún no hay copias',
  'tile.updates': 'Actualizaciones de Windows', 'tile.updatesPaused': 'En pausa hasta el {date}', 'tile.updatesOn': 'Se instalan con normalidad',
  'tile.help': 'Pedir ayuda', 'tile.helpSub': 'Crear un informe para soporte',
  'report.saved': 'Informe guardado en {path}',
  'notify.title': 'Avisar a todos', 'notify.label': 'Les aparecerá este mensaje en su pantalla.',
  'notify.placeholder': 'En 5 minutos se reinicia el equipo. Guarden su trabajo.', 'notify.sent': 'Aviso enviado',

  'conn.title': 'Conectados ahora', 'conn.sub': 'Personas usando este equipo a distancia',
  'conn.none': 'No hay nadie conectado.', 'conn.self': 'En este equipo · desde {ago}', 'conn.from': 'Desde {client} · {ago}',
  'conn.left': 'Se fue sin cerrar sesión · {ago}', 'conn.you': 'Tú',
  'conn.message': 'Mensaje', 'conn.disconnect': 'Desconectar', 'conn.logoff': 'Cerrar sesión', 'conn.notifyAll': 'Avisar a todos',
  'conn.msgTo': 'Mensaje para {name}', 'conn.msgLabel': 'Le aparecerá este mensaje en su pantalla.',
  'conn.msgPlaceholder': 'En 5 minutos se reinicia el equipo. Guarda tu trabajo.', 'conn.msgSent': 'Mensaje enviado',
  'conn.confirmDisconnect': '¿Desconectar a {name}?', 'conn.confirmLogoff': '¿Cerrar la sesión de {name}?',
  'conn.confirmDisconnectText': 'Perderá lo que no haya guardado. Conviene avisarle antes con un mensaje.',
  'conn.confirmLogoffText': 'Se cerrarán los programas que dejó abiertos.', 'conn.closed': 'Sesión cerrada',
  'conn.thisPc': 'este equipo',

  'acc.title': 'Accesos', 'acc.sub': 'Estas personas pueden conectarse a este equipo desde otro. Cada cuenta puede estar conectada una sola vez.',
  'acc.none': 'Todavía nadie tiene acceso.', 'acc.local': 'Cuenta de este equipo', 'acc.revoke': 'Quitar acceso', 'acc.grant': 'Dar acceso',
  'acc.confirmRevoke': '¿Quitar el acceso a {name}?', 'acc.confirmRevokeText': 'Ya no podrá conectarse a este equipo desde otro. Su cuenta y sus archivos no se borran.',
  'acc.revoked': 'Acceso quitado', 'acc.granted': '{name} ya puede entrar',
  'acc.pickText': 'Elige una cuenta de este equipo. Si la persona no tiene cuenta, pide a tu especialista que la cree.',
  'acc.searching': 'Buscando cuentas…', 'acc.allHave': 'Todas las cuentas ya tienen acceso.',

  'set.title': 'Ajustes', 'set.sub': 'Lo normal es no tener que tocar nada aquí',
  'set.autoFix': 'Arreglar solo cuando Windows se actualice', 'set.notify': 'Avisarme si algo deja de funcionar',
  'set.pause': 'Pausar actualizaciones de Windows hasta', 'set.pauseNone': 'Sin pausa: Windows se actualiza con normalidad',
  'set.paused': 'Actualizaciones en pausa', 'set.resumed': 'Actualizaciones reanudadas',
  'set.autoUpdate': 'Actualizar MUD Control automáticamente', 'set.language': 'Idioma',
  'set.startup': 'Iniciar con Windows', 'set.startupHint': 'Se abre en la bandeja al iniciar sesión',
  'tray.open': 'Abrir MUD Control', 'tray.fix': 'Arreglar ahora', 'tray.quit': 'Salir',
  'home.install': 'Instalar', 'home.installSub': 'Un clic instala lo necesario para que entren varias personas a la vez.',
  'home.confirmInstall': '¿Instalar en este equipo?',
  'home.confirmInstallText': 'Activa Escritorio remoto, instala RDP Wrapper, agrega una exclusión de Microsoft Defender para su carpeta y abre el puerto en redes de dominio y privadas. Se puede deshacer desde Opciones para especialistas.',
  'home.installed': 'Listo: ya pueden entrar varias personas', 'home.installing': 'Instalando… puede tardar un minuto.',
  'lang.auto': 'Como Windows', 'lang.es': 'Español', 'lang.en': 'English',
  'set.help': 'Pedir ayuda', 'set.helpSub': 'Crea un archivo con lo necesario para que soporte vea qué pasa', 'set.helpBtn': 'Crear informe',
  'bk.title': 'Copias de seguridad', 'bk.sub': 'Antes de cada cambio se guarda cómo estaba todo. Exportar sirve para llevar los accesos y ajustes a otro equipo (sin contraseñas).',
  'bk.none': 'Todavía no hay copias.', 'bk.restore': 'Volver a esta', 'bk.save': 'Guardar copia', 'bk.usb': 'Guardar en USB',
  'bk.export': 'Exportar configuración', 'bk.import': 'Importar configuración', 'bk.manual': 'Guardada a mano',
  'bk.saved': 'Copia guardada', 'bk.savedIn': 'Copia guardada en {path}', 'bk.exported': 'Configuración exportada a {path}',
  'bk.imported': 'Configuración importada', 'bk.importedMissing': 'Configuración importada. Faltan estas cuentas en este equipo: {list}',
  'bk.confirmTitle': '¿Volver a esta copia?', 'bk.confirmAction': 'Volver a esta copia',
  'bk.confirmText': 'Todo quedará como estaba el {when}. Antes se guarda una copia de cómo está ahora, por si quieres deshacerlo. Las personas conectadas se desconectarán unos segundos.',
  'bk.restored': 'Listo: se volvió a la copia',
  'spec.locked': 'Opciones para especialistas: estado, conexión, perfiles, reparación y diagnóstico', 'show': 'Mostrar', 'hide': 'Ocultar',

  'spec.title': 'Opciones para especialistas', 'spec.sub': 'Cada cambio guarda antes una copia de seguridad y queda en la actividad.',
  'spec.g1': 'Estado del sistema', 'spec.g2': 'Conexión y seguridad', 'spec.g3': 'Perfiles de cliente',
  'spec.g4': 'Reparación avanzada', 'spec.g5': 'Diagnóstico', 'spec.g6': 'Instalación',
  'spec.ini': 'Datos (INI)', 'spec.iniOk': 'Compatible', 'spec.iniNo': 'Sin soporte', 'spec.service': 'Servicio',
  'spec.running': 'En marcha', 'spec.stopped': 'Detenido', 'spec.loaded': 'Cargado', 'spec.notLoaded': 'No cargado', 'spec.profile': 'Perfil activo',
  'spec.port': 'Puerto RDP', 'spec.max': 'Máximo de sesiones a la vez', 'spec.nla': 'Autenticación NLA', 'spec.nlaHint': 'Recomendado: activada',
  'spec.fwPrivate': 'Firewall en redes de dominio y privadas', 'spec.fwPublic': 'Firewall en redes públicas', 'spec.fwPublicHint': 'No recomendado',
  'spec.shadow': 'Ver sesiones con permiso del usuario', 'spec.discard': 'Descartar', 'spec.apply': 'Aplicar cambios', 'spec.applied': 'Cambios aplicados',
  'spec.profileHint': '{active}{port} · {max} sesiones · {n} accesos', 'spec.activePrefix': 'Activo · ',
  'spec.edit': 'Editar', 'spec.editHint': 'Edita el perfil desde "Conexión y seguridad" y "Accesos"', 'spec.applyProfile': 'Aplicar',
  'spec.profileApplied': 'Perfil {name} aplicado', 'spec.newProfile': 'Crear perfil desde este equipo',
  'spec.newProfileHint': 'Copia la configuración actual ({name})', 'spec.new': 'Nuevo',
  'spec.updateIni': 'Actualizar datos de Windows', 'spec.updateIniHint': 'Descarga el INI y conserva las secciones locales',
  'spec.update': 'Actualizar', 'spec.updating': 'Actualizando…', 'spec.updated': 'Datos actualizados',
  'spec.offsets': 'Generar offsets en este equipo', 'spec.offsetsHint': 'Cuando aún no hay datos públicos. Defender puede bloquearlo',
  'spec.generate': 'Generar', 'spec.generating': 'Generando…', 'spec.generated': 'Offsets generados',
  'spec.wu': 'Reparar Windows Update', 'spec.wuHint': 'DISM, SFC y limpieza de caché. Puede tardar media hora',
  'spec.repair': 'Reparar', 'spec.repairing': 'Reparando…', 'spec.wuDone': 'Reparación de Windows Update terminada',
  'spec.logs': 'Registro técnico', 'spec.logsHint': 'Logs completos de los scripts', 'spec.open': 'Abrir',
  'spec.report': 'Informe de diagnóstico', 'spec.reportHint': 'Para enviar a otro especialista', 'spec.export': 'Exportar',
  'spec.reinstall': 'Reinstalar RDP Wrapper', 'spec.reinstallHint': 'Deja todo como recién instalado', 'spec.reinstallBtn': 'Reinstalar',
  'spec.uninstall': 'Desinstalar RDP Wrapper', 'spec.uninstallHint': 'El equipo vuelve a permitir una sola persona', 'spec.uninstallBtn': 'Desinstalar',
  'spec.confirmUninstall': '¿Desinstalar RDP Wrapper?', 'spec.confirmUninstallText': 'Solo podrá entrar una persona a la vez. Las personas conectadas se desconectarán.',
  'spec.confirmReinstall': '¿Reinstalar RDP Wrapper?', 'spec.confirmReinstallText': 'Las personas conectadas se desconectarán unos segundos. Se guarda una copia antes.',
  'spec.confirmOffsets': '¿Generar offsets en este equipo?', 'spec.confirmOffsetsText': 'Descarga RDPWrapOffsetFinder (llccd). Microsoft Defender suele marcarlo como amenaza; úsalo solo si confías en la herramienta.',
  'spec.uninstalled': 'RDP Wrapper desinstalado', 'spec.reinstalled': 'RDP Wrapper reinstalado',
  'spec.newTitle': 'Nuevo perfil', 'spec.newLabel': 'Nombre del cliente o del equipo', 'spec.newPlaceholder': 'Oficina central',
  'spec.create': 'Crear', 'spec.created': 'Perfil {name} creado',

  'act.title': 'Actividad reciente', 'act.all': 'Ver todo', 'act.less': 'Ver menos', 'act.none': 'Todavía no hay actividad.',

  'about.title': 'Acerca de', 'about.version': 'Versión {v}',
  'about.desc': 'Permite que varias personas se conecten a la vez por Escritorio remoto a un equipo con Windows 11 Pro, y lo mantiene funcionando cuando Windows se actualiza.',
  'about.support': 'Puedes apoyar mi trabajo mediante PayPal o Patreon.', 'about.based': 'Basado en RDP Wrapper Library',

  'date.today': 'Hoy, {time}', 'date.yesterday': 'Ayer, {time}', 'date.now': 'ahora mismo',
  'file.filter': 'Configuración de MUD Control', 'file.folder': 'Elige el USB o la carpeta donde guardar la copia',
}

type Dict = Record<keyof typeof es, string>

const en: Dict = {
  'tab.inicio': 'Home', 'tab.conectados': 'Connected', 'tab.accesos': 'Access', 'tab.ajustes': 'Settings',
  'tabs.label': 'Sections', 'activity': 'Activity',
  'title.about': 'About', 'title.minimize': 'Minimize', 'title.close': 'Close',
  'err.generic': "Couldn't finish. The details are in the technical log.",
  'cancel': 'Cancel', 'close': 'Close', 'send': 'Send', 'loading': 'Loading…',

  'home.checking': 'Checking this computer…',
  'home.fixing': 'Fixing…',
  'home.fixingSub': 'Connected people will be disconnected for a few seconds and can sign back in.',
  'step.check': 'Checking this computer', 'step.search': 'Looking for the fix', 'step.backup': 'Saving a backup',
  'step.apply': 'Applying the fix', 'step.verify': 'Making sure it works',
  'home.ok': 'Everything is working', 'home.broken': 'Only one person can sign in right now',
  'home.notInstalled': "MUD Control isn't set up on this computer yet",
  'home.notInstalledSub': 'Ask your specialist to install it.',
  'home.brokenSub': 'Windows updated and turned off multiple connections. One click fixes it.',
  'home.okSub': '{n} {people} now · up to {max} can sign in at once',
  'people.connected.one': 'person connected', 'people.connected.many': 'people connected',
  'people.one': 'person', 'people.many': 'people',
  'home.fix': 'Fix now', 'home.check': 'Check', 'home.checked': 'Checked',
  'home.fixed': 'Done: several people can sign in again',
  'home.notFixed': "Couldn't fix it yet. It will try again on its own.",
  'tile.connected': 'Connected', 'tile.connectedSub': '{n} {people} now',
  'tile.access': 'Access', 'tile.accessSub.one': '1 person can sign in', 'tile.accessSub.many': '{n} people can sign in',
  'tile.notify': 'Message everyone', 'tile.notifySub': 'Send a message',
  'tile.backups': 'Backups', 'tile.backupsSub': 'Latest: {when}', 'tile.backupsNone': 'No backups yet',
  'tile.updates': 'Windows updates', 'tile.updatesPaused': 'Paused until {date}', 'tile.updatesOn': 'Installing as usual',
  'tile.help': 'Get help', 'tile.helpSub': 'Create a report for support',
  'report.saved': 'Report saved to {path}',
  'notify.title': 'Message everyone', 'notify.label': 'This message will pop up on their screen.',
  'notify.placeholder': 'This computer restarts in 5 minutes. Save your work.', 'notify.sent': 'Message sent',

  'conn.title': 'Connected now', 'conn.sub': 'People using this computer remotely',
  'conn.none': 'Nobody is connected.', 'conn.self': 'On this computer · for {ago}', 'conn.from': 'From {client} · {ago}',
  'conn.left': 'Left without signing out · {ago}', 'conn.you': 'You',
  'conn.message': 'Message', 'conn.disconnect': 'Disconnect', 'conn.logoff': 'Sign out', 'conn.notifyAll': 'Message everyone',
  'conn.msgTo': 'Message for {name}', 'conn.msgLabel': 'This message will pop up on their screen.',
  'conn.msgPlaceholder': 'This computer restarts in 5 minutes. Save your work.', 'conn.msgSent': 'Message sent',
  'conn.confirmDisconnect': 'Disconnect {name}?', 'conn.confirmLogoff': 'Sign out {name}?',
  'conn.confirmDisconnectText': "They'll lose anything they haven't saved. Send them a message first.",
  'conn.confirmLogoffText': 'The programs they left open will close.', 'conn.closed': 'Session closed',
  'conn.thisPc': 'this computer',

  'acc.title': 'Access', 'acc.sub': 'These people can connect to this computer from another one. Each account can be signed in only once.',
  'acc.none': 'Nobody has access yet.', 'acc.local': 'Account on this computer', 'acc.revoke': 'Remove access', 'acc.grant': 'Give access',
  'acc.confirmRevoke': 'Remove access for {name}?', 'acc.confirmRevokeText': "They won't be able to connect from another computer. Their account and files stay.",
  'acc.revoked': 'Access removed', 'acc.granted': '{name} can sign in now',
  'acc.pickText': "Pick an account on this computer. If the person doesn't have one, ask your specialist to create it.",
  'acc.searching': 'Looking for accounts…', 'acc.allHave': 'Every account already has access.',

  'set.title': 'Settings', 'set.sub': "You usually won't need to change anything here",
  'set.autoFix': 'Fix automatically when Windows updates', 'set.notify': 'Tell me if something stops working',
  'set.pause': 'Pause Windows updates until', 'set.pauseNone': 'Not paused: Windows updates as usual',
  'set.paused': 'Updates paused', 'set.resumed': 'Updates resumed',
  'set.autoUpdate': 'Update MUD Control automatically', 'set.language': 'Language',
  'set.startup': 'Start with Windows', 'set.startupHint': 'Opens in the tray when you sign in',
  'tray.open': 'Open MUD Control', 'tray.fix': 'Fix now', 'tray.quit': 'Quit',
  'home.install': 'Install', 'home.installSub': 'One click installs what is needed for several people to connect at once.',
  'home.confirmInstall': 'Install on this computer?',
  'home.confirmInstallText': 'Turns on Remote Desktop, installs RDP Wrapper, adds a Microsoft Defender exclusion for its folder and opens the port on domain and private networks. You can undo it from Specialist options.',
  'home.installed': 'Done: several people can sign in now', 'home.installing': 'Installing… this can take a minute.',
  'lang.auto': 'Same as Windows', 'lang.es': 'Español', 'lang.en': 'English',
  'set.help': 'Get help', 'set.helpSub': 'Creates a file with what support needs to see the problem', 'set.helpBtn': 'Create report',
  'bk.title': 'Backups', 'bk.sub': 'Before every change, the current setup is saved. Export takes access and settings to another computer (no passwords).',
  'bk.none': 'No backups yet.', 'bk.restore': 'Go back to this', 'bk.save': 'Save backup', 'bk.usb': 'Save to USB',
  'bk.export': 'Export settings', 'bk.import': 'Import settings', 'bk.manual': 'Saved manually',
  'bk.saved': 'Backup saved', 'bk.savedIn': 'Backup saved to {path}', 'bk.exported': 'Settings exported to {path}',
  'bk.imported': 'Settings imported', 'bk.importedMissing': "Settings imported. These accounts don't exist on this computer: {list}",
  'bk.confirmTitle': 'Go back to this backup?', 'bk.confirmAction': 'Go back to this backup',
  'bk.confirmText': "Everything will be as it was on {when}. A backup of the current setup is saved first, in case you want to undo it. Connected people will be disconnected for a few seconds.",
  'bk.restored': 'Done: the backup was restored',
  'spec.locked': 'Specialist options: status, connection, profiles, repair and diagnostics', 'show': 'Show', 'hide': 'Hide',

  'spec.title': 'Specialist options', 'spec.sub': 'Every change saves a backup first and shows up in the activity.',
  'spec.g1': 'System status', 'spec.g2': 'Connection and security', 'spec.g3': 'Client profiles',
  'spec.g4': 'Advanced repair', 'spec.g5': 'Diagnostics', 'spec.g6': 'Installation',
  'spec.ini': 'Data (INI)', 'spec.iniOk': 'Supported', 'spec.iniNo': 'Not supported', 'spec.service': 'Service',
  'spec.running': 'Running', 'spec.stopped': 'Stopped', 'spec.loaded': 'Loaded', 'spec.notLoaded': 'Not loaded', 'spec.profile': 'Active profile',
  'spec.port': 'RDP port', 'spec.max': 'Maximum sessions at once', 'spec.nla': 'NLA authentication', 'spec.nlaHint': 'Recommended: on',
  'spec.fwPrivate': 'Firewall on domain and private networks', 'spec.fwPublic': 'Firewall on public networks', 'spec.fwPublicHint': 'Not recommended',
  'spec.shadow': 'View sessions with the user’s permission', 'spec.discard': 'Discard', 'spec.apply': 'Apply changes', 'spec.applied': 'Changes applied',
  'spec.profileHint': '{active}{port} · {max} sessions · {n} accounts', 'spec.activePrefix': 'Active · ',
  'spec.edit': 'Edit', 'spec.editHint': 'Edit the profile from "Connection and security" and "Access"', 'spec.applyProfile': 'Apply',
  'spec.profileApplied': 'Profile {name} applied', 'spec.newProfile': 'Create a profile from this computer',
  'spec.newProfileHint': 'Copies the current setup ({name})', 'spec.new': 'New',
  'spec.updateIni': 'Update Windows data', 'spec.updateIniHint': 'Downloads the INI and keeps local sections',
  'spec.update': 'Update', 'spec.updating': 'Updating…', 'spec.updated': 'Data updated',
  'spec.offsets': 'Generate offsets on this computer', 'spec.offsetsHint': 'When there is no public data yet. Defender may block it',
  'spec.generate': 'Generate', 'spec.generating': 'Generating…', 'spec.generated': 'Offsets generated',
  'spec.wu': 'Repair Windows Update', 'spec.wuHint': 'DISM, SFC and cache cleanup. Can take half an hour',
  'spec.repair': 'Repair', 'spec.repairing': 'Repairing…', 'spec.wuDone': 'Windows Update repair finished',
  'spec.logs': 'Technical log', 'spec.logsHint': 'Full logs from the scripts', 'spec.open': 'Open',
  'spec.report': 'Diagnostic report', 'spec.reportHint': 'To send to another specialist', 'spec.export': 'Export',
  'spec.reinstall': 'Reinstall RDP Wrapper', 'spec.reinstallHint': 'Leaves everything freshly installed', 'spec.reinstallBtn': 'Reinstall',
  'spec.uninstall': 'Uninstall RDP Wrapper', 'spec.uninstallHint': 'The computer goes back to one person at a time', 'spec.uninstallBtn': 'Uninstall',
  'spec.confirmUninstall': 'Uninstall RDP Wrapper?', 'spec.confirmUninstallText': 'Only one person will be able to sign in at a time. Connected people will be disconnected.',
  'spec.confirmReinstall': 'Reinstall RDP Wrapper?', 'spec.confirmReinstallText': 'Connected people will be disconnected for a few seconds. A backup is saved first.',
  'spec.confirmOffsets': 'Generate offsets on this computer?', 'spec.confirmOffsetsText': 'Downloads RDPWrapOffsetFinder (llccd). Microsoft Defender often flags it as a threat; only use it if you trust the tool.',
  'spec.uninstalled': 'RDP Wrapper uninstalled', 'spec.reinstalled': 'RDP Wrapper reinstalled',
  'spec.newTitle': 'New profile', 'spec.newLabel': 'Client or computer name', 'spec.newPlaceholder': 'Head office',
  'spec.create': 'Create', 'spec.created': 'Profile {name} created',

  'act.title': 'Recent activity', 'act.all': 'See all', 'act.less': 'See less', 'act.none': 'No activity yet.',

  'about.title': 'About', 'about.version': 'Version {v}',
  'about.desc': 'Lets several people connect at once through Remote Desktop to a Windows 11 Pro computer, and keeps it working when Windows updates.',
  'about.support': 'You can support my work through PayPal or Patreon.', 'about.based': 'Based on RDP Wrapper Library',

  'date.today': 'Today, {time}', 'date.yesterday': 'Yesterday, {time}', 'date.now': 'just now',
  'file.filter': 'MUD Control settings', 'file.folder': 'Pick the USB drive or folder for the backup',
}

export type Key = keyof typeof es
const DICTS: Record<Lang, Dict> = { es, en }

// Textos de la actividad: el backend guarda una clave y parametros, la interfaz los traduce.
const ACT: Record<Lang, Record<string, string>> = {
  es: {
    fix_ok: 'Las conexiones múltiples volvieron a funcionar', fix_backup: 'Se guardó una copia de seguridad antes de arreglar',
    fix_pending: 'Todavía no hay solución para esta versión de Windows. Se volverá a intentar solo.', fix_error: 'No se pudo arreglar (código {code})',
    msg_all: 'Se envió un aviso a todos los conectados', msg_one: 'Se envió un mensaje a una persona conectada',
    logoff: 'Se cerró la sesión de {name}', grant: 'Se dio acceso a {name}', revoke: 'Se quitó el acceso a {name}',
    pause: 'Actualizaciones de Windows en pausa hasta el {date}', resume: 'Se reanudaron las actualizaciones de Windows',
    backup: 'Se guardó una copia de seguridad', restore: 'Se volvió a una copia de seguridad', backup_folder: 'Se guardó una copia en {path}',
    export: 'Se exportó la configuración', import: 'Se importó la configuración {name}', specialist: 'Se cambiaron opciones de conexión y seguridad',
    profile_new: 'Se creó el perfil {name}', profile_apply: 'Se aplicó el perfil {name}', ini: 'Se buscaron datos nuevos para esta versión de Windows',
    offsets: 'Se generaron offsets en este equipo', wu: 'Se reparó Windows Update', reinstall: 'Se reinstaló RDP Wrapper',
    uninstall: 'Se desinstaló RDP Wrapper: solo puede entrar una persona',
  },
  en: {
    fix_ok: 'Multiple connections are working again', fix_backup: 'A backup was saved before fixing',
    fix_pending: "There's no fix for this Windows version yet. It will try again on its own.", fix_error: "Couldn't fix it (code {code})",
    msg_all: 'A message was sent to everyone connected', msg_one: 'A message was sent to a connected person',
    logoff: '{name} was signed out', grant: '{name} was given access', revoke: 'Access removed for {name}',
    pause: 'Windows updates paused until {date}', resume: 'Windows updates resumed',
    backup: 'A backup was saved', restore: 'A backup was restored', backup_folder: 'A backup was saved to {path}',
    export: 'Settings were exported', import: 'Settings {name} were imported', specialist: 'Connection and security options were changed',
    profile_new: 'Profile {name} was created', profile_apply: 'Profile {name} was applied', ini: 'Checked for new data for this Windows version',
    offsets: 'Offsets were generated on this computer', wu: 'Windows Update was repaired', reinstall: 'RDP Wrapper was reinstalled',
    uninstall: 'RDP Wrapper was uninstalled: only one person can sign in',
  },
}

// Motivo de cada copia de seguridad (reasonKey del backend).
const REASON: Record<Lang, Record<string, string>> = {
  es: {
    fix: 'Antes de arreglar las conexiones', manual: 'Guardada a mano', before_restore: 'Antes de volver a una copia',
    usb: 'Copia en USB o carpeta externa', before_import: 'Antes de importar una configuración',
    before_specialist: 'Antes de cambiar conexión y seguridad', before_profile: 'Antes de aplicar el perfil {name}',
    before_ini: 'Antes de actualizar los datos de Windows', before_offsets: 'Antes de generar offsets',
    before_reinstall: 'Antes de reinstalar', before_uninstall: 'Antes de desinstalar',
  },
  en: {
    fix: 'Before fixing connections', manual: 'Saved manually', before_restore: 'Before going back to a backup',
    usb: 'Copy on USB or external folder', before_import: 'Before importing settings',
    before_specialist: 'Before changing connection and security', before_profile: 'Before applying profile {name}',
    before_ini: 'Before updating Windows data', before_offsets: 'Before generating offsets',
    before_reinstall: 'Before reinstalling', before_uninstall: 'Before uninstalling',
  },
}

const fill = (s: string, p?: Record<string, string | number>) =>
  p ? s.replace(/\{(\w+)\}/g, (_, k) => (p[k] !== undefined ? String(p[k]) : `{${k}}`)) : s

export function translate(lang: Lang, key: Key, p?: Record<string, string | number>) {
  return fill(DICTS[lang][key] ?? es[key] ?? key, p)
}
export function translateActivity(lang: Lang, key: string | undefined, params: Record<string, string> | undefined, fallback: string) {
  const s = key && ACT[lang][key]
  return s ? fill(s, params) : fallback
}

export function translateReason(lang: Lang, key: string | undefined, params: Record<string, string> | undefined, fallback: string) {
  const r = key && REASON[lang][key]
  return r ? fill(r, params) : fallback
}

export function systemLang(): Lang {
  return (navigator.languages?.[0] ?? navigator.language ?? 'es').toLowerCase().startsWith('es') ? 'es' : 'en'
}
export function loadPref(): LangPref {
  try { const v = localStorage.getItem('mud.lang'); return v === 'es' || v === 'en' ? v : 'auto' } catch { return 'auto' }
}
export function savePref(p: LangPref) {
  try { if (p === 'auto') localStorage.removeItem('mud.lang'); else localStorage.setItem('mud.lang', p) } catch { /* sin almacenamiento */ }
}

export interface I18n {
  lang: Lang
  pref: LangPref
  setPref: (p: LangPref) => void
  t: (key: Key, p?: Record<string, string | number>) => string
}
export const I18nCtx = createContext<I18n>(null!)
export const useT = () => useContext(I18nCtx)
