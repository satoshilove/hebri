# Native NSIS UI rehearsal for the disposable Windows runner only. This is not
# a developer-machine installer driver: the caller must retain its CI guard.
function Wait-VisibleHebriInstaller([System.Diagnostics.Process]$Process, [string]$EvidenceDir) {
    if ($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_ENVIRONMENT -ne 'github-hosted') {
        throw 'Visible installer automation requires disposable hosted CI.'
    }
    Add-Type -AssemblyName System.Drawing
    Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Text;
public static class HebriInstallerUi {
  public delegate bool EnumCallback(IntPtr h, IntPtr p);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumCallback f, IntPtr p);
  [DllImport("user32.dll")] static extern bool EnumChildWindows(IntPtr h, EnumCallback f, IntPtr p);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsWindowEnabled(IntPtr h);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern IntPtr GetDlgItem(IntPtr h, int id);
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out Rect r);
  [DllImport("user32.dll")] static extern bool PrintWindow(IntPtr h, IntPtr dc, uint flags);
  public static string Text(IntPtr h) { var b=new StringBuilder(1024); GetWindowText(h,b,b.Capacity); return b.ToString(); }
  public static string Class(IntPtr h) { var b=new StringBuilder(128); GetClassName(h,b,b.Capacity); return b.ToString(); }
  public static IntPtr[] Windows() { var a=new List<IntPtr>(); EnumWindows((h,p)=>{if(IsWindowVisible(h)&&Class(h)=="#32770"&&Text(h).StartsWith("Hebri")&&Text(h).Contains("Setup"))a.Add(h);return true;},IntPtr.Zero); return a.ToArray(); }
  public static IntPtr[] Children(IntPtr h) { var a=new List<IntPtr>(); EnumChildWindows(h,(c,p)=>{if(IsWindowVisible(c))a.Add(c);return true;},IntPtr.Zero);return a.ToArray(); }
  public static void Capture(IntPtr h,string file) {
    Rect r; if(!GetWindowRect(h,out r)||r.Right<=r.Left||r.Bottom<=r.Top)throw new Exception("Installer has no visible bounds");
    using(var b=new Bitmap(r.Right-r.Left,r.Bottom-r.Top)) {
      using(var g=Graphics.FromImage(b)) { var dc=g.GetHdc(); try {if(!PrintWindow(h,dc,2))throw new Exception("Installer capture failed");} finally {g.ReleaseHdc(dc);} }
      b.Save(file,ImageFormat.Png);
    }
  }
}
'@
    New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null
    $progressSeen = $false
    $finished = $false
    $deadline = (Get-Date).AddMinutes(3)
    while ((Get-Date) -lt $deadline -and -not $Process.HasExited) {
        $windows = @([HebriInstallerUi]::Windows())
        if ($windows.Count -gt 1) { throw 'Ambiguous installer windows in disposable runner.' }
        if ($windows.Count -eq 1) {
            $window = $windows[0]
            $children = @([HebriInstallerUi]::Children($window))
            if (-not $progressSeen -and @($children | Where-Object { [HebriInstallerUi]::Class($_) -eq 'msctls_progress32' }).Count -gt 0) {
                [HebriInstallerUi]::Capture($window, (Join-Path $EvidenceDir 'installing.png'))
                $progressSeen = $true
                Write-Host 'PASS: native installer progress window is visible.'
            }
            $finish = [HebriInstallerUi]::GetDlgItem($window, 1)
            if ([HebriInstallerUi]::IsWindowEnabled($finish) -and [HebriInstallerUi]::Text($finish).Replace('&','') -eq 'Finish') {
                [HebriInstallerUi]::Capture($window, (Join-Path $EvidenceDir 'finished.png'))
                foreach ($child in $children) {
                    if ([HebriInstallerUi]::Class($child) -eq 'Button' -and [HebriInstallerUi]::Text($child).Replace('&','') -match '^Run Hebri') {
                        # BM_SETCHECK: do not launch the app into the runner's profile.
                        [void][HebriInstallerUi]::SendMessage($child, 0x00f1, [IntPtr]::Zero, [IntPtr]::Zero)
                    }
                }
                [void][HebriInstallerUi]::PostMessage($window, 0x0111, [IntPtr]1, $finish)
                $finished = $true
                break
            }
        }
        Start-Sleep -Milliseconds 100
        $Process.Refresh()
    }
    if (-not $progressSeen -or -not $finished) { throw "Visible installer rehearsal failed: progress=$progressSeen finish=$finished" }
    if (-not $Process.WaitForExit(30000)) { throw 'Installer did not exit after Finish.' }
    Write-Host 'PASS: native installer completion screen confirmed.'
}
