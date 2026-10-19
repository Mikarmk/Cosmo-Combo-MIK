import AppKit
import QuartzCore
import CoreText
import Darwin

final class EdgePanel: NSPanel {
    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }
}
final class EdgeView: NSView {
    let rail = CAShapeLayer()
    let fill = CAShapeLayer()
    let message = NSTextField(labelWithString: "")
    override init(frame: NSRect) {
        super.init(frame: frame)
        wantsLayer = true
        for item in [rail, fill] {
            item.fillColor = NSColor.clear.cgColor
            item.lineCap = .round
            item.lineJoin = .round
            layer!.addSublayer(item)
        }
        rail.strokeColor = NSColor.white.withAlphaComponent(0.11).cgColor
        rail.lineWidth = 1
        fill.strokeColor = NSColor.white.withAlphaComponent(0.95).cgColor
        fill.lineWidth = 2.5
        message.font = NSFont(name: "Tektur-Regular", size: 18) ?? NSFont.monospacedSystemFont(ofSize: 18, weight: .medium)
        message.textColor = .white
        message.alignment = .center
        message.isBezeled = false
        message.drawsBackground = false
        addSubview(message)
    }
    required init?(coder: NSCoder) { fatalError() }
    override func layout() {
        super.layout()
        let inset: CGFloat = 4.5
        let left = inset, right = bounds.width-inset, bottom = inset, top = bounds.height-inset
        let radius: CGFloat = 18
        let path = CGMutablePath()
        path.move(to: CGPoint(x:bounds.midX,y:top))
        path.addLine(to:CGPoint(x:right-radius,y:top))
        path.addQuadCurve(to:CGPoint(x:right,y:top-radius),control:CGPoint(x:right,y:top))
        path.addLine(to:CGPoint(x:right,y:bottom+radius))
        path.addQuadCurve(to:CGPoint(x:right-radius,y:bottom),control:CGPoint(x:right,y:bottom))
        path.addLine(to:CGPoint(x:left+radius,y:bottom))
        path.addQuadCurve(to:CGPoint(x:left,y:bottom+radius),control:CGPoint(x:left,y:bottom))
        path.addLine(to:CGPoint(x:left,y:top-radius))
        path.addQuadCurve(to:CGPoint(x:left+radius,y:top),control:CGPoint(x:left,y:top))
        path.addLine(to:CGPoint(x:bounds.midX,y:top))
        rail.path = path
        fill.path = path
        message.frame = NSRect(x:bounds.midX-290,y:top-76,width:580,height:30)
    }
    func update(progress: Double, notice: String) {
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        fill.strokeEnd = CGFloat(max(0,min(1,progress)))
        CATransaction.commit()
        message.stringValue = notice
        message.isHidden = notice.isEmpty
        if !notice.isEmpty && fill.animation(forKey:"rest") == nil {
            let pulse = CABasicAnimation(keyPath: "opacity")
            pulse.fromValue = 0.5; pulse.toValue = 1
            pulse.duration = 1.6; pulse.autoreverses = true; pulse.repeatCount = .infinity
            if !NSWorkspace.shared.accessibilityDisplayShouldReduceMotion { fill.add(pulse,forKey:"rest") }
        } else if notice.isEmpty { fill.removeAnimation(forKey:"rest") }
    }
}
final class App: NSObject, NSApplicationDelegate {
    let stateURL: URL
    var panels: [(EdgePanel,EdgeView)] = []
    var item: NSStatusItem!
    var tick: Timer?
    var idleSince: Date?
    var lastPhase = ""
    var lockFD: Int32 = -1
    init(state: String) { stateURL=URL(fileURLWithPath:state);super.init() }
    func applicationDidFinishLaunching(_ notification: Notification) {
        lockFD = open(stateURL.deletingLastPathComponent().appendingPathComponent("perimeter.lock").path,O_CREAT|O_RDWR,0o600)
        if lockFD < 0 || flock(lockFD,LOCK_EX|LOCK_NB) != 0 { NSApp.terminate(nil);return }
        NSApp.setActivationPolicy(.accessory)
        item = NSStatusBar.system.statusItem(withLength:NSStatusItem.variableLength)
        rebuild()
        NotificationCenter.default.addObserver(self,selector:#selector(rebuild),name:NSApplication.didChangeScreenParametersNotification,object:nil)
        tick = Timer.scheduledTimer(timeInterval:0.2,target:self,selector:#selector(update),userInfo:nil,repeats:true)
        RunLoop.main.add(tick!,forMode:.common)
        update()
    }
    @objc func rebuild() {
        for (panel,_) in panels { panel.close() }
        panels = NSScreen.screens.map { screen in
            let panel=EdgePanel(contentRect:screen.frame,styleMask:[.borderless,.nonactivatingPanel],backing:.buffered,defer:false)
            panel.isReleasedWhenClosed=false
            panel.backgroundColor = .clear; panel.isOpaque=false; panel.hasShadow=false
            panel.level=NSWindow.Level(rawValue:Int(CGWindowLevelForKey(.desktopIconWindow))+1)
            panel.ignoresMouseEvents=true; panel.hidesOnDeactivate=false
            panel.collectionBehavior=[.canJoinAllSpaces,.stationary,.ignoresCycle]
            let view=EdgeView(frame:NSRect(origin:.zero,size:screen.frame.size))
            panel.contentView=view
            view.needsLayout=true
            return (panel,view)
        }
    }
    func readState() -> [String:Any] {
        guard let data=try? Data(contentsOf:stateURL),let result=try? JSONSerialization.jsonObject(with:data) as? [String:Any] else { return ["mode":"idle"] }
        return result
    }
    @objc func update() {
        let state=readState()
        let mode=state["mode"] as? String ?? "idle"
        if mode != "focus" && mode != "break" {
            for (panel,_) in panels { panel.orderOut(nil) }
            if idleSince == nil { idleSince=Date() }
            if Date().timeIntervalSince(idleSince!)>3 { NSApp.terminate(nil) }
            item.button?.title="◷"
            return
        }
        idleSince=nil
        let start=(state["startedAt"] as? Double) ?? Date().timeIntervalSince1970
        let duration=max(1,(state["duration"] as? Double) ?? 1800)
        let elapsed=max(0,Date().timeIntervalSince1970-start)
        let remaining=max(0,Int(ceil(duration-elapsed)))
        let ready=elapsed>=duration
        let phase=ready ? (mode=="focus" ? "breakReady":"complete") : mode
        let notice=ready ? (mode=="focus" ? "TIME FOR A BREAK · 5 MINUTES":"BREAK COMPLETE") : ""
        for (panel,view) in panels {
            view.update(progress:elapsed/duration,notice:notice)
            if !panel.isVisible { panel.orderFrontRegardless() }
        }
        item.button?.title=ready ? (mode=="focus" ? "◷ Break":"◷ Done") : String(format:"◷ %02d:%02d",remaining/60,remaining%60)
        item.button?.font=NSFont.monospacedDigitSystemFont(ofSize:12,weight:.regular)
        if phase != lastPhase {
            lastPhase=phase
            let menu=NSMenu()
            let label=NSMenuItem(title:ready ? notice : (mode=="focus" ? "Focus":"Break"),action:nil,keyEquivalent:"")
            menu.addItem(label);menu.addItem(NSMenuItem.separator())
            if phase=="breakReady" {
                let rest=NSMenuItem(title:"Start a 5-minute break",action:#selector(startBreak),keyEquivalent:"")
                rest.target=self;menu.addItem(rest)
            }
            let stop=NSMenuItem(title:"Stop timer",action:#selector(stop),keyEquivalent:"")
            stop.target=self;menu.addItem(stop)
            item.menu=menu
        }
    }
    func save(mode:String) {
        var data=readState()
        if mode=="break" { data["mode"]="break";data["duration"]=300;data["startedAt"]=Date().timeIntervalSince1970 }
        else { data=["mode":"idle","minutes":data["minutes"] ?? 30] }
        if let bytes=try? JSONSerialization.data(withJSONObject:data) { try? bytes.write(to:stateURL,options:.atomic) }
        update()
    }
    @objc func stop() { save(mode:"idle") }
    @objc func startBreak() { save(mode:"break") }
}
let args=CommandLine.arguments
if args.count<2 { exit(1) }
if args.count>2 { CTFontManagerRegisterFontsForURL(URL(fileURLWithPath:args[2]) as CFURL,.process,nil) }
let app=NSApplication.shared
let delegate=App(state:args[1]);app.delegate=delegate
app.run()
